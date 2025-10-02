import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';

type TextureSet = {
  baseColor: THREE.Texture;
  normal?: THREE.Texture;
  emissive?: THREE.Texture;
  orm?: THREE.Texture; // R=AO, G=Roughness, B=Metalness
};

export class EntityLoader {
  private loader: THREE.Loader;

  constructor(private LoaderType: new () => THREE.Loader) {
    this.loader = new LoaderType();
  }

  private loadedObject: THREE.Group<THREE.Object3DEventMap>[] = new Array();

  public async loadObjectAsync(path: string, textures?: TextureSet): Promise<any> {
    const object = await (this.loader as any).loadAsync(path);

    if (textures) {
      this.applyTexturesToObject(object, textures);
    }

    this.loadedObject.push(object);
    return object;
  }

  public loadObject(
    path: string,
    onLoad: (data: THREE.Group<THREE.Object3DEventMap>) => void,
    textures?: TextureSet
  ): THREE.Object3D {
    this.loader.load(path, (object: any) => {
      onLoad(object);

      if (textures) {
        this.applyTexturesToObject(object, textures);
      }

      this.loadedObject.push(object);
      return object;
    });

    return new THREE.Group();
  }

  private applyTexturesToObject(object: THREE.Object3D, textures: TextureSet): void {
    // mark sRGB textures if supported by the current three version
    textures.baseColor.colorSpace = THREE.SRGBColorSpace;
    if (textures.emissive) textures.emissive.colorSpace = THREE.SRGBColorSpace;

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry: THREE.BufferGeometry = child.geometry;

        if (!geometry.getAttribute('uv2') && geometry.getAttribute('uv')) {
          geometry.setAttribute(
            'uv2',
            new THREE.BufferAttribute(geometry.getAttribute('uv').array, 2)
          );
        }

        child.material = new THREE.MeshStandardMaterial({
          map: textures.baseColor,
          normalMap: textures.normal,
          emissive: new THREE.Color(0x000000),
          emissiveMap: textures.emissive,
          emissiveIntensity: textures.emissive ? 1.0 : 0.0,
          aoMap: textures.orm,
          roughnessMap: textures.orm,
          metalnessMap: textures.orm,
          roughness: 1.0,
          metalness: 0.0,
        });
      }
    });
  }
}
