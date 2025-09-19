import { Component, signal, AfterViewInit } from '@angular/core';
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { EntityLoader } from '@/loaders/EntityLoader';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss',
  providers: [
    { provide: Window, useValue: window }
  ],
})
export class App implements AfterViewInit {
  protected readonly title = signal('3d_man');
  constructor(private window: Window) { }

  protected animationActions: THREE.AnimationAction[] = new Array();
  protected mixer: THREE.AnimationMixer | undefined;

  async ngAfterViewInit(): Promise<void> {
    const width = this.window.innerWidth, height = this.window.innerHeight;

    // init
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.z = 3;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(120);
    const gridHelper = new THREE.GridHelper(200, 500);
    scene.add(gridHelper);
    scene.add(new THREE.AxesHelper())

    // basic lighting so materials are visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = false;
    scene.add(dirLight);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const controls = new OrbitControls(camera, renderer.domElement)

    renderer.setSize(width, height);
    renderer.setAnimationLoop(animate.bind(this));

    document.body.appendChild(renderer.domElement);
    const entityLoader = new EntityLoader();

    const model = await entityLoader.loadObjectAsync('/models/Y Bot.fbx');
    model.scale.setScalar(0.01);
    scene.add(model);

    this.mixer = new THREE.AnimationMixer(model);
    var modelReady: boolean = false;
    entityLoader.loadObject('/models/Capoeira.fbx', (object) => {
      if (this.mixer) {
        const animationAction = this.mixer.clipAction(object.animations[0])
        modelReady = true;
        animationAction.play();
        this.animationActions.push(animationAction)
      }
    });

    const clock = new THREE.Clock()

    // animation
    function animate(time: number) {
      if (modelReady) {
        this.mixer?.update(clock.getDelta());
      }

      controls.update();
      renderer.render(scene, camera);
    }

  }
}
