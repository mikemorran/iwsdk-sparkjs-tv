import {
  AdditiveBlending,
  createSystem,
  Mesh,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from '@iwsdk/core';
import { TVState } from '../components.js';

const GAZE_BUILD_TIME = 30;
const GAZE_FADE_TIME = 3.0;
const GAZE_DOT_THRESHOLD = 0.96; // ~16° half-angle
const TV_SCREEN_POS = new Vector3(-0.12, 0.35, -1.394);

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec2 vUv;

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 hue2rgb(float h) {
    h = fract(h);
    float r = abs(h * 6.0 - 3.0) - 1.0;
    float g = 2.0 - abs(h * 6.0 - 2.0);
    float b = 2.0 - abs(h * 6.0 - 4.0);
    return clamp(vec3(r, g, b), 0.0, 1.0);
  }

  void main() {
    if (uIntensity < 0.005) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }
    float frame = floor(uTime * 24.0);
    float noise = hash21(floor(vUv * 180.0) / 180.0 + vec2(frame * 0.1273, frame * 0.3147));

    float hue = fract(noise * 0.6 + uTime * 0.08 + vUv.x * 0.25 + vUv.y * 0.15);
    vec3 color = hue2rgb(hue);
    color *= noise * 0.8 + 0.2;

    // Sparse pixels: only show noise above threshold so it feels like static not solid color
    float alpha = uIntensity * smoothstep(0.28, 0.62, noise) * 0.9;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class GazeTimerSystem extends createSystem({
  tv: { required: [TVState] },
}) {
  private gazeIntensity = 0;
  private overlayMat!: ShaderMaterial;
  private overlayMesh!: Mesh;
  private elapsedTime = 0;

  // Pre-allocated to avoid GC in update()
  private headPos = new Vector3();
  private headFwd = new Vector3();
  private headQuat = new Quaternion();
  private toTV = new Vector3();
  private overlayOffset = new Vector3();

  init() {
    this.overlayMat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    // Large world-space plane tracked to the head each frame
    // 3×3m at 0.4m distance covers even wide VR FOVs
    const geo = new PlaneGeometry(3, 3);
    this.overlayMesh = new Mesh(geo, this.overlayMat);
    this.overlayMesh.renderOrder = 999;
    this.world.scene.add(this.overlayMesh);
  }

  update(delta: number) {
    this.elapsedTime += delta;
    this.overlayMat.uniforms['uTime'].value = this.elapsedTime;

    // Track overlay plane to head (world-space so both eyes see it in stereo)
    const head = this.player.head;
    head.getWorldPosition(this.headPos);
    head.getWorldQuaternion(this.headQuat);
    this.overlayOffset.set(0, 0, -0.4).applyQuaternion(this.headQuat);
    this.overlayMesh.position.copy(this.headPos).add(this.overlayOffset);
    this.overlayMesh.quaternion.copy(this.headQuat);

    const tvEntity = this.queries.tv.entities.values().next().value;
    const isPowered = tvEntity ? (tvEntity.getValue(TVState, 'isPowered') as boolean) : false;

    if (!isPowered) {
      this.gazeIntensity = Math.max(0, this.gazeIntensity - delta / GAZE_FADE_TIME);
      this.overlayMat.uniforms['uIntensity'].value = this.gazeIntensity;
      return;
    }

    // Gaze detection: dot product of head-forward vs direction-to-TV
    this.headFwd.set(0, 0, -1).applyQuaternion(this.headQuat);
    this.toTV.copy(TV_SCREEN_POS).sub(this.headPos).normalize();
    const dot = this.headFwd.dot(this.toTV);

    if (dot > GAZE_DOT_THRESHOLD) {
      this.gazeIntensity = Math.min(1, this.gazeIntensity + delta / GAZE_BUILD_TIME);
    } else {
      this.gazeIntensity = Math.max(0, this.gazeIntensity - delta / GAZE_FADE_TIME);
    }

    this.overlayMat.uniforms['uIntensity'].value = this.gazeIntensity;
  }
}
