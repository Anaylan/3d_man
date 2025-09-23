import { Component, signal, OnInit, QueryList, ViewChildren } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ThreeService } from '@/services/three-service';
import { Character } from './character/character';
import { Tickable } from './tickable';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Character],
  providers: [{ provide: Window, useValue: window }],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  @ViewChildren(Tickable) private updatableChildren!: QueryList<Tickable>;

  protected readonly title = signal('3d_man');

  constructor(public threeService: ThreeService, private window: Window) {}
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock = new THREE.Clock();
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  protected init() {
    const width = this.window.innerWidth,
      height = this.window.innerHeight;

    this.scene = this.threeService.createScene();
    this.camera = this.threeService.createCamera(width, height, 70, 0.1, 1000);
    this.threeService.createLights();
    this.renderer = this.threeService.createRenderer(document.body, width, height);

    const gridHelper = new THREE.GridHelper(200, 500);
    this.scene.add(gridHelper);
    this.scene.add(new THREE.AxesHelper());
  }

  ngOnInit(): void {
    this.init();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.renderer.setAnimationLoop(this.animate);
  }

  private animate = (time: number) => {
    this.controls.update();

    if (this.updatableChildren) {
      this.updatableChildren.forEach((child) => child.update(this.clock.getDelta()));
    }

    this.renderer.render(this.scene, this.camera);
  };
}
