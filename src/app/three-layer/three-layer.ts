import { Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ThreeService } from '@/services/three-service';
import { TickService } from '@/services/tick-service';
import { Character } from '../character/character';

@Component({
  selector: 'app-three-layer',
  imports: [Character],
  // providers: [{ provide: Window, useValue: window }],
  templateUrl: './three-layer.html',
  styleUrl: './three-layer.scss',
})
export class ThreeLayer implements OnInit, OnDestroy {
  constructor(
    public threeService: ThreeService,
    private elementRef: ElementRef,
    private tickService: TickService
  ) {}

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock: THREE.Clock = new THREE.Clock();
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private resizeObserver?: ResizeObserver;

  private getParentSize() {
    const parent = this.elementRef.nativeElement.parentElement;
    if (!parent) {
      return { width: 800, height: 600 };
    }

    const rect = parent.getBoundingClientRect();
    return {
      width: rect.width || parent.offsetWidth,
      height: rect.height || parent.offsetHeight,
    };
  }

  protected init() {
    const { width, height } = this.getParentSize();
    const parrent = this.elementRef.nativeElement.parrentElement;

    this.scene = this.threeService.createScene();
    this.camera = this.threeService.createCamera(width, height, 70, 0.1, 1000);
    this.renderer = this.threeService.createRenderer(this.elementRef.nativeElement, width, height);

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
