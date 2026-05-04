// export const SPLAT_URL = 'https://sparkjs.dev/assets/splats/butterfly.spz';

export type CameraMode = 'orbit' | 'elevated' | 'lowAngle' | 'closeZoom' | 'wideAngle' | 'sideDrift';

export interface ChannelConfig {
  url: string;
  cameraPosition: [number, number, number];
  cameraLookAt: [number, number, number];
  glowColor: string;
  cameraMode: CameraMode;
  splatRotation?: [number, number, number]; // Euler XYZ in radians
}

export const CHANNEL_CONFIG: ChannelConfig[] = [
  {
    url: "https://sparkjs.dev/assets/splats/butterfly.spz",
    cameraPosition: [0, 0.2, 2],
    cameraLookAt: [0, 0, 0],
    splatRotation: [Math.PI, 0, 0],
    glowColor: '#FFE8CC',
    cameraMode: 'orbit',
  },
  {
    url: "https://sparkjs.dev/assets/splats/food/pad-thai.spz",
    cameraPosition: [0, 3, 2],
    cameraLookAt: [0, 0, 0],
    splatRotation: [Math.PI, 0, 0],
    glowColor: '#FFE8CC',
    cameraMode: 'orbit',
  },
  {
    url: "https://sparkjs.dev/assets/splats/food/iberico-sandwich-by-reserve.spz",
    cameraPosition: [0, 1, 0],
    cameraLookAt: [0, 0, 0],
    splatRotation: [Math.PI, 0, 0],
    glowColor: '#FFE8CC',
    cameraMode: 'orbit',
  },
  {
    url: "https://sparkjs.dev/assets/splats/robot-head.spz",
    cameraPosition: [0, 2, 4],
    cameraLookAt: [0, 0, 0],
    splatRotation: [Math.PI, 0, 0],
    glowColor: '#FFE8CC',
    cameraMode: 'orbit',
  },
  {
    url: "https://sparkjs.dev/assets/splats/food/primerib-tamos.spz",
    cameraPosition: [0, 3, 2],
    cameraLookAt: [0, 0, 0],
    splatRotation: [Math.PI, 0, 0],
    glowColor: '#FFE8CC',
    cameraMode: 'orbit',
  },
  {
    url: "https://sparkjs.dev/assets/splats/food/steaksandwich-mels.spz",
    cameraPosition: [0, 3, 3],
    cameraLookAt: [0, 0, 0],
    splatRotation: [Math.PI, 0, 0],
    glowColor: '#FFE8CC',
    cameraMode: 'orbit',
  },
];
