import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ThreeService } from '@/services/three-service';
import { TickService } from '@/services/tick-service';
import { Character } from './character/character';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Character],
  providers: [{ provide: Window, useValue: window }],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('3d_man');

  constructor(
    public threeService: ThreeService,
    private window: Window,
    private tickService: TickService
  ) {}
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
    this.renderer = this.threeService.createRenderer(
      document.querySelector('app-root')!,
      width,
      height
    );

    const gridHelper = new THREE.GridHelper(200, 500);
    this.scene.add(gridHelper);
    this.scene.add(new THREE.AxesHelper());
    
    this.threeService.createLights();
  }

  ngOnInit(): void {
    this.init();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.renderer.setAnimationLoop(this.animate);
  }

  ngOnDestroy(): void {
    this.threeService.dispose();
  }

  private animate = () => {
    const delta = this.clock.getDelta();

    this.controls.update();
    this.tickService.tick(delta);

    this.renderer.render(this.scene, this.camera);
  };
}
