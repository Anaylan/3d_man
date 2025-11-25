import {
  Component,
  ComponentRef,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ThreeService } from '@/services/three-service';
import { TickService } from '@/services/tick-service';
import { Character } from '../character/character';
import { GUI } from 'dat.gui';
import { ConfigService } from '../character/character-config.service';
import { HttpClient } from '@angular/common/http';
import { CharacterConfig, PreviewConfig } from '../character/character.models';
import { TitleCasePipe } from '@angular/common';
import { Subject, switchMap, takeUntil } from 'rxjs';

@Component({
  selector: 'app-three-layer',
  imports: [TitleCasePipe],
  templateUrl: './three-layer.html',
  styleUrl: './three-layer.scss',
})
export class ThreeLayer implements OnInit, OnDestroy {
  @Input() cameraPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  @Input() controlRotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  private destroy$ = new Subject<void>();
  private changeCharacter$ = new Subject<string>();

  @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
  private characterRef: ComponentRef<Character> | null = null;

  public threeService = inject(ThreeService);
  private tickService = inject(TickService);
  private configService = inject(ConfigService);

  protected characters: PreviewConfig[] = new Array();
  getConfigData() {
    return this.http.get(`/characters/config.json`);
  }

  constructor(private elementRef: ElementRef, private http: HttpClient) {}

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  private gui = new GUI({ name: 'debug', hideable: true });
  public getGUI() {
    return this.gui;
  }

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

  @HostListener('window:resize')
  onWindowResize() {
    const { width, height } = this.getParentSize();

    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  protected init() {
    const { width, height } = this.getParentSize();

    this.scene = this.threeService.createScene();
    this.camera = this.threeService.createCamera(width, height, 70, 0.1, 100);
    this.renderer = this.threeService.createRenderer(this.elementRef.nativeElement, width, height);

    const gridHelper = new THREE.GridHelper(200, 500);
    this.scene.add(gridHelper);

    this.threeService.createLights();
  }

  ngOnInit(): void {
    this.init();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.set(this.cameraPosition.x, this.cameraPosition.y, this.cameraPosition.z);
    this.controls.target.set(
      this.controlRotation.x,
      this.controlRotation.y,
      this.controlRotation.z
    );

    this.getConfigData()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.characters = data as PreviewConfig[];
        this.characters?.[0]?.shortName && this.changeCharacter(this.characters[0].shortName);
      });

    this.changeCharacter$
      .pipe(
        switchMap((shortName) => this.configService.getConfig(shortName)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (config) => {
          if (config) {
            this.destroyCharacter();
            this.createCharacter(config);
          }
        },
        error: (err) => console.error(err),
      });

    this.renderer.setAnimationLoop(this.animate);
  }

  ngOnDestroy(): void {
    this.threeService.dispose();

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
    }
  }

  private animate = () => {
    this.controls.update();
    this.tickService.tick();

    this.renderer.render(this.scene, this.camera);
  };

  protected async changeCharacter(value: string) {
    this.changeCharacter$.next(value);
  }

  private destroyCharacter(): void {
    if (this.characterRef) {
      this.characterRef.destroy();
    }
    this.container.clear();
  }

  private async createCharacter(config: CharacterConfig) {
    this.characterRef = this.container.createComponent(Character);
    this.characterRef.setInput('config', config);
    this.characterRef.setInput('gui', this.gui);
  }
}
