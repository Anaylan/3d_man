import { Tickable } from '@/interfaces/tickable';
import { EntityLoader } from '@/loaders/entity-loader';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import * as THREE from 'three';

export const MESH_TOKEN = new InjectionToken<THREE.Object3D | THREE.AnimationObjectGroup>('Mesh');

@Injectable()
export class AnimatorService implements Tickable {
  protected animationActions: Map<string, THREE.AnimationAction> = new Map();
  private mixer!: THREE.AnimationMixer;
  private loader: EntityLoader;

  private currentAnimation!: THREE.AnimationAction;
  private lastAnimation!: THREE.AnimationAction;

  constructor(@Inject(MESH_TOKEN) private mesh: THREE.Object3D | THREE.AnimationObjectGroup) {
    this.loader = new EntityLoader();
    this.mixer = new THREE.AnimationMixer(mesh);
  }

  public setMap(paths: Map<string, string>) {
    for (const [key, value] of paths) {
      if (value.trim().length > 1) {
        this.loader.loadObject(value, (object) => {
          this.setPair(key, object.animations[0]);
        });
      }
    }
  }

  public setPair(key: string, animation: THREE.AnimationClip): THREE.AnimationAction {
    const animationAction = this.mixer.clipAction(animation);
    this.animationActions.set(key, animationAction);

    return animationAction;
  }

  public playAnimation(key: string): void {
    const animation = this.animationActions.get(key);

    if (animation) {
      if (this.currentAnimation) {
        this.lastAnimation = this.currentAnimation;
        this.lastAnimation.fadeOut(1);
      }

      this.currentAnimation = animation;
      this.currentAnimation.reset();
      this.currentAnimation.fadeIn(1);
      this.currentAnimation.play();
    }
  }

  public update(deltaTime: number): void {
    this.mixer.update(deltaTime);
  }
}
