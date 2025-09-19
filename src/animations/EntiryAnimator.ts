import * as THREE from "three"

export class EntiryAnimator {
    protected animationActions: THREE.AnimationAction[] = new Array();
    
    constructor(private mesh: THREE.Mesh, 
        private mixer: THREE.AnimationMixer) { }

    public updateAnim(deltaTime: number) {

    }
}
