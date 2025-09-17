import { Component, signal, AfterViewInit } from '@angular/core';
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

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
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
    camera.position.z = 3;

    const scene = new THREE.Scene();
    const gridHelper = new THREE.GridHelper(200, 500);
    scene.add(gridHelper);
    scene.add(new THREE.AxesHelper(5))

    const spawnObject = async function () {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/examples/jsm/libs/draco/');
      const modelLoader = new GLTFLoader();
      modelLoader.setDRACOLoader(dracoLoader);
      const { scene: model } = await modelLoader.loadAsync("/models/scene.gltf");
      model.rotation.set(Math.PI / 2, 0, 0, "XYZ");
      model.traverse(function (child: THREE.Object3D<THREE.Object3DEventMap>) {
        if (child.animations) {
          // You can access and modify materials or textures here if needed
          // For example: child.material.map = newTexture;
        }
      });
      scene.add(model);
    }();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const controls = new OrbitControls(camera, renderer.domElement)

    renderer.setSize(width, height);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    // animation
    function animate(time: number) {

      controls.update();

      renderer.render(scene, camera);

    }
  }
}
