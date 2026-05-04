import {
  Box3,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type CameraMode = 'orbit' | 'elevated' | 'lowAngle' | 'closeZoom' | 'wideAngle' | 'sideDrift';

export function createStaticTexture(width = 128, height = 128): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 60);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export interface TVObjects {
  group: Group;
  screenMesh: Mesh;
  glowLight: PointLight;
}

// TV faces +Z (toward viewer at origin). All z values negative = in front of viewer.
const TV_Z = -1.7;
// Screen face is recessed inside the bezel; place overlay at the glass depth
const TV_FRONT_Z = -1.396; // flush with bezel face to eliminate floating gap
const TV_SCREEN_CENTER_Y = 0.36; // centered on screen opening inside bezel
const TV_SCREEN_CENTER_X = -0.11; // screen is offset left; wood panel is on the right

// Target dimensions matching the original procedural TV
const TARGET_HEIGHT = 1.15;

const SCREEN_KEYWORDS = ['screen', 'display', 'crt', 'monitor', 'glass', 'tube', 'tv_screen'];

export async function buildTVMesh(): Promise<TVObjects> {
  const tvGroup = new Group();
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/gltf/tv_retro_white.glb');
  const model = gltf.scene;

  // Auto-scale to target height
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const scale = TARGET_HEIGHT / size.y;
  model.scale.setScalar(scale);

  // Rotate to face viewer (screen toward +Z = toward origin)
  model.rotation.y = Math.PI;

  // Position: bottom at y=0, centered at TV_Z
  const box2 = new Box3().setFromObject(model);
  model.position.set(0, -box2.min.y, TV_Z);
  tvGroup.add(model);

  // Find screen mesh by name heuristics
  let screenMesh: Mesh | null = null;
  model.traverse((child) => {
    if (screenMesh) return;
    if (child instanceof Mesh) {
      const name = child.name.toLowerCase();
      if (SCREEN_KEYWORDS.some((k) => name.includes(k))) {
        screenMesh = child;
      }
    }
  });

  if (screenMesh) {
    (screenMesh as Mesh).name = 'tv-screen';
  } else {
    // Fallback: overlay plane positioned at the screen face
    const staticTex = createStaticTexture();
    const fallbackMat = new MeshStandardMaterial({
      color: new Color('#111111'),
      emissive: new Color('#000000'),
      roughness: 0.3,
      map: staticTex,
    });
    const mesh = new Mesh(new PlaneGeometry(0.704, 0.54), fallbackMat);
    mesh.name = 'tv-screen';
    mesh.position.set(TV_SCREEN_CENTER_X, TV_SCREEN_CENTER_Y, TV_FRONT_Z);
    tvGroup.add(mesh);
    screenMesh = mesh;
  }

  const glowLight = new PointLight('#FFE8CC', 0, 4);
  glowLight.position.set(TV_SCREEN_CENTER_X, TV_SCREEN_CENTER_Y, TV_FRONT_Z + 0.1);
  tvGroup.add(glowLight);

  return { group: tvGroup, screenMesh: screenMesh as Mesh, glowLight };
}
