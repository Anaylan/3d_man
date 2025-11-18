import { Injectable } from '@angular/core';
import { Tickable } from '@/interfaces/tickable';
import * as THREE from 'three';

@Injectable({ providedIn: 'root' })
export class TickService {
  private subscribers: Set<(deltaTime: number) => void> = new Set();
  private tickableToCallback: Map<Tickable, (deltaTime: number) => void> = new Map();
  private clock: THREE.Clock = new THREE.Clock();

  public registerTickable(tickable: Tickable): void {
    const callback = (dt: number) => tickable.update(dt);
    this.tickableToCallback.set(tickable, callback);
    this.subscribers.add(callback);
  }

  public unregisterTickable(tickable: Tickable): void {
    const callback = this.tickableToCallback.get(tickable);
    if (callback) {
      this.subscribers.delete(callback);
      this.tickableToCallback.delete(tickable);
    }
  }

  public tick(): void {
    const deltaTime = this.clock.getDelta();
    this.subscribers.forEach((callback) => callback(deltaTime));
  }
}
