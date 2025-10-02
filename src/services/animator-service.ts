import { Tickable } from '@/interfaces/tickable';
import { EntityLoader } from '@/loaders/entity-loader';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export const MESH_TOKEN = new InjectionToken<THREE.Object3D | THREE.AnimationObjectGroup>('Mesh');

@Injectable()
export class AnimatorService implements Tickable {
  private actions = new Map<string, THREE.AnimationAction>();
  private mixer: THREE.AnimationMixer;
  private loader = new EntityLoader(FBXLoader);
  private currentAction?: THREE.AnimationAction;

  constructor(@Inject(MESH_TOKEN) private mesh: THREE.Object3D | THREE.AnimationObjectGroup) {
    this.loader = new EntityLoader(FBXLoader);
    this.mixer = new THREE.AnimationMixer(mesh);
  }

  public setMap(paths: Map<string, string>) {
    for (const [key, path] of paths) {
      if (path.trim()) {
        this.loader.loadObject(path, (object) => {
          this.setPair(key, object.animations[0]);
        });
      }
    }
  }

  public setPair(key: string, animation: THREE.AnimationClip): THREE.AnimationAction {
    const action = this.mixer.clipAction(animation);
    this.actions.set(key, action);
    return action;
  }

  public playAnimation(key: string): void {
    const action = this.actions.get(key);
    if (!action) return;

    if (action) {
      if (this.currentAction && this.currentAction !== action) {
        this.currentAction.fadeOut(1);
      }

      this.currentAction = action;
      this.currentAction.reset().fadeIn(1).play();
    }
  }

  public update(deltaTime: number): void {
    this.mixer.update(deltaTime);
  }

  public isReady(): boolean {
    return this.actions.size > 0;
  }
}
