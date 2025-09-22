import { EntityLoader } from '@/loaders/EntityLoader';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import * as THREE from 'three';

export const MESH_TOKEN = new InjectionToken<THREE.Object3D | THREE.AnimationObjectGroup>('Mesh');

@Injectable({
  providedIn: 'root',
})
export class AnimatorService {
  protected animationActions: Map<string, THREE.AnimationAction> = new Map();
  private mixer: THREE.AnimationMixer;
  private loader: EntityLoader;

  constructor(@Inject(MESH_TOKEN) private mesh: THREE.Object3D | THREE.AnimationObjectGroup) {
    this.mixer = new THREE.AnimationMixer(mesh);
    this.loader = new EntityLoader();
  }

  public init(paths: Map<string, string>) {
    for (const [key, value] of paths) {
      if (value.trim().length > 1) {
        this.loader.loadObject(value, (object) => {
          const animationAction = this.setPair(key, object.animations[0]);
          // animationAction.play();
        });
      }
    }
  }

  public setPair(key: string, animation: THREE.AnimationClip): THREE.AnimationAction {
    const animationAction = this.mixer.clipAction(animation);
    this.animationActions.set(key, animationAction);

    return animationAction;
  }

  public update(deltaTime: number) {
    this.mixer.update(deltaTime);
  }
}
