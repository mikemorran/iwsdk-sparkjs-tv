import {
  AmbientLight,
  BackSide,
  CircleGeometry,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  ShaderMaterial,
} from '@iwsdk/core';

const SPHERE_RADIUS = 2.2;
const SPHERE_CENTER_Y = 1.3;
const FLOOR_RADIUS = Math.sqrt(SPHERE_RADIUS * SPHERE_RADIUS - SPHERE_CENTER_Y * SPHERE_CENTER_Y);

const wallVertexShader = /* glsl */ `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const wallFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;

  vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c / 2.0;
    vec3 rgb;
    if      (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
    else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
    else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
    else                   rgb = vec3(c, 0.0, x);
    return rgb + m;
  }

  void main() {
    // offset=0 → wrap point at +Z (behind viewer), keeping seam out of sightline
    float angle = fract(atan(vPosition.x, vPosition.z) / 6.28318530718);
    float height = clamp((vPosition.y + 2.2) / 4.4, 0.0, 1.0);

    // multiplier=1.0 → exactly one hue cycle, no colour jump at wrap point
    float hue = fract(angle * 1.0 + uTime * 0.035 + height * 0.25);
    float saturation = 0.55 + 0.10 * sin(uTime * 0.07 + angle * 6.28318);
    float lightness  = 0.72 + 0.06 * sin(uTime * 0.05 + height * 3.14159);

    gl_FragColor = vec4(hsl2rgb(hue, saturation, lightness), 1.0);
  }
`;

let wallMat: ShaderMaterial | null = null;

function buildWallMesh(): Mesh {
  wallMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0.0 } },
    vertexShader: wallVertexShader,
    fragmentShader: wallFragmentShader,
    side: BackSide,
  });
  // IcosahedronGeometry has no UV seam — fully seamless when using position-based shader
  const geo = new IcosahedronGeometry(SPHERE_RADIUS, 4);
  const mesh = new Mesh(geo, wallMat);
  mesh.position.y = SPHERE_CENTER_Y;
  return mesh;
}

function buildFloorMesh(): Mesh {
  // Add 0.15m overlap so floor hides the sphere's bottom edge seam
  const geo = new CircleGeometry(FLOOR_RADIUS + 0.15, 48);
  const mat = new MeshStandardMaterial({ color: '#c2deff' });
  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export interface RoomObjects {
  group: Group;
  ambientLight: AmbientLight;
  directionalLight: DirectionalLight;
}

export function buildRoomMesh(): RoomObjects {
  const group = new Group();

  group.add(buildWallMesh(), buildFloorMesh());

  const ambientLight = new AmbientLight('#FFF5E4', 1.2);
  const directionalLight = new DirectionalLight('#FFE8CC', 0.4);
  directionalLight.position.set(0, 3, -1);

  const fillLight = new PointLight('#FFF0E4', 0.5, 6, 1.5);
  fillLight.position.set(0, 1.8, 0);

  group.add(ambientLight, directionalLight, fillLight);

  return { group, ambientLight, directionalLight };
}

export function updateRoomTime(elapsed: number): void {
  if (wallMat) {
    (wallMat.uniforms as Record<string, { value: number }>)['uTime'].value = elapsed;
  }
}
