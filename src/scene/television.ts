import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
} from '@iwsdk/core';

const CASING_MAT = new MeshStandardMaterial({ color: '#c2deff' });

function box(w: number, h: number, d: number): Mesh {
  return new Mesh(new BoxGeometry(w, h, d), CASING_MAT);
}

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

export function buildTVMesh(): TVObjects {
  const tvGroup = new Group();

  const stand = box(0.8, 0.35, 0.4);
  stand.position.set(0, 0.35, TV_Z);
  tvGroup.add(stand);

  const body = box(0.7, 0.6, 0.45);
  body.position.set(0, 0.88, TV_Z);
  tvGroup.add(body);

  const antennaMat = new MeshStandardMaterial({ color: '#c2deff' });
  const antennaGeo = new CylinderGeometry(0.005, 0.005, 0.35, 6);

  const antL = new Mesh(antennaGeo, antennaMat);
  antL.position.set(-0.24, 0.88 + 0.3 + 0.35 / 2 * Math.cos(Math.PI / 6), TV_Z);
  antL.rotation.z = (Math.PI / 180) * 30;

  const antR = new Mesh(antennaGeo, antennaMat);
  antR.position.set(0.24, 0.88 + 0.3 + 0.35 / 2 * Math.cos(Math.PI / 6), TV_Z);
  antR.rotation.z = -(Math.PI / 180) * 30;

  tvGroup.add(antL, antR);

  const screenGeo = new PlaneGeometry(0.52, 0.4);
  const staticTex = createStaticTexture();
  const screenMat = new MeshStandardMaterial({
    color: new Color('#111111'),
    emissive: new Color('#000000'),
    roughness: 0.3,
    map: staticTex,
    transparent: false,
  });
  screenMat.color.setHex(0x111111);

  const screenMesh = new Mesh(screenGeo, screenMat);
  screenMesh.name = 'tv-screen';
  // Rotate to face viewer (-Z direction); position 1cm proud of TV body front face
  screenMesh.rotation.y = Math.PI;
  screenMesh.position.set(0, 0.88, TV_Z + 0.235);
  tvGroup.add(screenMesh);

  const glowLight = new PointLight('#FFE8CC', 0, 4);
  glowLight.position.set(0, 0.88, TV_Z + 0.15);
  tvGroup.add(glowLight);

  return { group: tvGroup, screenMesh, glowLight };
}
