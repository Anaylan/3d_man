import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class ThreeService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  public createScene(): THREE.Scene {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0a0a0);

    return this.scene;
  }

  public createCamera(
    width: number,
    height: number,
    fov?: number,
    near?: number,
    far?: number
  ): THREE.PerspectiveCamera {
    this.camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    this.camera.position.set(0, 0, 5);

    return this.camera;
  }

  public createRenderer(
    container: HTMLElement,
    width: number,
    height: number
  ): THREE.WebGLRenderer {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    return this.renderer;
  }

  public createLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
