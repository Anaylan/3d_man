import { Injectable } from '@angular/core';
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
    // this.scene.fog = new THREE.FogExp2(0xcccccc, 0.01);
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
