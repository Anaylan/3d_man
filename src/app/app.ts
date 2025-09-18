import { Component, signal, AfterViewInit } from '@angular/core';
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { EntitySpawner } from '../loaders/EntitySpawner';

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

  async ngAfterViewInit(): Promise<void> {
    const width = window.innerWidth, height = window.innerHeight;

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
    // set renderer color space (newer three.js)
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const controls = new OrbitControls(camera, renderer.domElement)

    renderer.setSize(width, height);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    const root = await new EntitySpawner().spawnObject('/models/young.fbx');
    root.scale.setScalar(0.01);
    scene.add(root);

    // animation
    function animate(time: number) {
      // requestAnimationFrame(animate);

      controls.update();
      renderer.render(scene, camera);
    }
  }
}
