import { CanvasTexture, DoubleSide, ShaderMaterial } from '@iwsdk/core';

export function createStaticNoiseTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
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
  uniform float uStaticBlend;
  uniform float uCollapse;
  uniform float uScanlineWipe;
  uniform float uScanlineWidth;
  uniform float uTime;
  uniform float uBlackout;
  varying vec2 vUv;

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    if (uBlackout > 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec2 uv = vUv;

    // Vertical collapse (CRT phosphor)
    if (uCollapse > 0.0) {
      float squash = 1.0 - uCollapse;
      uv.y = (uv.y - 0.5) * max(squash, 0.001) + 0.5;
      if (uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
    }

    vec4 channelColor = texture2D(uTexture, uv);

    // Animated static: per-frame procedural noise
    float frame = floor(uTime * 30.0);
    float noise = hash21(floor(uv * 120.0) / 120.0 + vec2(frame * 0.1273, frame * 0.3147));
    float noiseVal = noise * 0.85 + 0.1;
    vec4 animStatic = vec4(noiseVal, noiseVal, noiseVal, 1.0);

    vec4 color = mix(channelColor, animStatic, uStaticBlend);

    // Scanline wipe (power-on effect)
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
  uTexture: { value: unknown };
  uStaticBlend: { value: number };
  uCollapse: { value: number };
  uScanlineWipe: { value: number };
  uScanlineWidth: { value: number };
  uTime: { value: number };
  uBlackout: { value: number };
}

export function createScreenMaterial(): ShaderMaterial {
  const placeholder = createStaticNoiseTexture();

  const uniforms: ScreenUniforms = {
    uTexture: { value: placeholder },
    uStaticBlend: { value: 0.0 },
    uCollapse: { value: 0.0 },
    uScanlineWipe: { value: 0.0 },
    uScanlineWidth: { value: 0.03 },
    uTime: { value: 0.0 },
    uBlackout: { value: 1.0 }, // Start black — TV is off
  };

  return new ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, { value: unknown }>,
    vertexShader,
    fragmentShader,
    side: DoubleSide,
  });
}
