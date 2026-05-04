import { CanvasTexture, DoubleSide, ShaderMaterial, Texture } from '@iwsdk/core';

export function createStaticNoiseTexture(size = 256): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.floor(Math.random() * 120 + 40);
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return new CanvasTexture(canvas);
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform sampler2D uStaticTex;
  uniform float uStaticBlend;
  uniform float uCollapse;
  uniform float uScanlineWipe;
  uniform float uScanlineWidth;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Vertical collapse effect (CRT phosphor collapse): squash UV toward center
    if (uCollapse > 0.0) {
      float squash = 1.0 - uCollapse;
      uv.y = (uv.y - 0.5) * max(squash, 0.001) + 0.5;
      if (uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
    }

    vec4 channelColor = texture2D(uTexture, uv);
    vec4 staticColor  = texture2D(uStaticTex, uv * 4.0);
    vec4 color = mix(channelColor, staticColor, uStaticBlend);

    // Scanline wipe: bright horizontal line sweeping top→bottom
    if (uScanlineWipe > 0.0 && uScanlineWipe < 1.0) {
      float lineY = 1.0 - uScanlineWipe;
      float dist = abs(uv.y - lineY);
      float brightness = smoothstep(uScanlineWidth, 0.0, dist);
      color = mix(color, vec4(1.0, 1.0, 0.95, 1.0), brightness * 0.85);
    }

    gl_FragColor = color;
  }
`;

export interface ScreenUniforms {
  uTexture: { value: Texture };
  uStaticTex: { value: Texture };
  uStaticBlend: { value: number };
  uCollapse: { value: number };
  uScanlineWipe: { value: number };
  uScanlineWidth: { value: number };
}

export function createScreenMaterial(staticTex: CanvasTexture): ShaderMaterial {
  const uniforms: ScreenUniforms = {
    uTexture: { value: staticTex },
    uStaticTex: { value: staticTex },
    uStaticBlend: { value: 1.0 }, // Start fully static (off)
    uCollapse: { value: 0.0 },
    uScanlineWipe: { value: 0.0 },
    uScanlineWidth: { value: 0.03 },
  };

  return new ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, { value: unknown }>,
    vertexShader,
    fragmentShader,
    side: DoubleSide,
  });
}
