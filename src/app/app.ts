import { Component, signal, AfterViewInit } from '@angular/core';
import { NgtCanvas } from 'angular-three';
import { SceneGraph } from './experience/scene';
import { InjectFlags } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgtCanvas],
  // templateUrl: './app.html',
  // styleUrl: './app.scss',
  template: `
    <ngt-canvas [sceneGraph]="scene"/>
  `
})
export class App implements AfterViewInit {
  protected readonly title = signal('3d_man');
  scene = SceneGraph;

  ngAfterViewInit(): void {
  }
}
