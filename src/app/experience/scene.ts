import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import * as THREE from "three"
import { extend } from 'angular-three'

extend(THREE)

@Component({
    standalone: true,
    template: `
    <ngt-mesh>
        <ngt-box-geometry />
    </ngt-mesh>
    <ngts-orbit-controls/>
    `,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SceneGraph { }