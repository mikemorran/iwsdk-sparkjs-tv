import { Color, PointLight, ShaderMaterial } from '@iwsdk/core';
import type { SplatMesh } from '@sparkjsdev/spark';
import { CHANNEL_CONFIG } from '../channels/channelConfig.js';
import type { ScreenUniforms } from './screenShader.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Uses setTimeout instead of requestAnimationFrame so animations work inside
// an active WebXR immersive session (Quest throttles window.rAF in XR mode).
function animateValue(
  getter: () => number,
  setter: (v: number) => void,
  target: number,
  durationMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    const start = getter();
    const startTime = performance.now();
    function tick() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      setter(lerp(start, target, t));
      if (t < 1) setTimeout(tick, 0);
      else resolve();
    }
    setTimeout(tick, 0);
  });
}

function uniforms(mat: ShaderMaterial): ScreenUniforms {
  return mat.uniforms as unknown as ScreenUniforms;
}

export async function playPowerOn(
  screenMat: ShaderMaterial,
  splat: SplatMesh,
  glowLight: PointLight,
  channelIndex: number,
): Promise<void> {
  const u = uniforms(screenMat);
  const targetGlowColor = new Color(CHANNEL_CONFIG[channelIndex].glowColor);

  splat.opacity = 0;

  // Flicker: 3 rapid opacity pulses on static
  for (let i = 0; i < 3; i++) {
    u.uStaticBlend.value = 0.1;
    await sleep(80);
    u.uStaticBlend.value = 1.0;
    await sleep(80);
  }

  // Scanline wipe top→bottom over 200ms
  await animateValue(
    () => u.uScanlineWipe.value,
    (v) => { u.uScanlineWipe.value = v; },
    1.0,
    200,
  );
  u.uScanlineWipe.value = 0;

  // Fade out static and reveal splat simultaneously
  const revealStart = performance.now();
  const revealDuration = 800;
  await new Promise<void>((resolve) => {
    function tick() {
      const t = Math.min((performance.now() - revealStart) / revealDuration, 1);
      u.uStaticBlend.value = 1 - t;
      splat.opacity = t;
      if (t < 1) setTimeout(tick, 0);
      else resolve();
    }
    setTimeout(tick, 0);
  });

  // Glow light fade in
  const glowStart = performance.now();
  const glowDuration = 600;
  const fromColor = new Color(0x000000);
  await new Promise<void>((resolve) => {
    function tick() {
      const t = Math.min((performance.now() - glowStart) / glowDuration, 1);
      glowLight.intensity = t * 0.6;
      glowLight.color.lerpColors(fromColor, targetGlowColor, t);
      if (t < 1) setTimeout(tick, 0);
      else resolve();
    }
    setTimeout(tick, 0);
  });
}

export async function playPowerOff(
  screenMat: ShaderMaterial,
  splat: SplatMesh,
  glowLight: PointLight,
): Promise<void> {
  const u = uniforms(screenMat);

  // Dissolve splat out over 400ms
  await animateValue(
    () => splat.opacity,
    (v) => { splat.opacity = v; },
    0,
    400,
  );

  // Blend in static while collapsing
  const collapseStart = performance.now();
  const collapseDuration = 300;
  await new Promise<void>((resolve) => {
    function tick() {
      const t = Math.min((performance.now() - collapseStart) / collapseDuration, 1);
      u.uCollapse.value = t;
      u.uStaticBlend.value = t;
      glowLight.intensity = (1 - t) * 0.6;
      if (t < 1) setTimeout(tick, 0);
      else resolve();
    }
    setTimeout(tick, 0);
  });

  // Cut to black
  u.uCollapse.value = 0;
  u.uStaticBlend.value = 1.0;
  glowLight.intensity = 0;
}

export async function playChannelChange(
  screenMat: ShaderMaterial,
  outSplat: SplatMesh,
  inSplat: SplatMesh,
  glowLight: PointLight,
  inChannelIndex: number,
): Promise<void> {
  const u = uniforms(screenMat);
  const targetGlowColor = new Color(CHANNEL_CONFIG[inChannelIndex].glowColor);
  const fromGlowColor = glowLight.color.clone();

  // Fade in static over 150ms
  await animateValue(
    () => u.uStaticBlend.value,
    (v) => { u.uStaticBlend.value = v; },
    1.0,
    150,
  );

  // Dissolve out old splat over 300ms
  await animateValue(
    () => outSplat.opacity,
    (v) => { outSplat.opacity = v; },
    0,
    300,
  );
  inSplat.opacity = 0;

  // Reveal new splat over 400ms, fade out static
  const revealStart = performance.now();
  const revealDuration = 400;
  await new Promise<void>((resolve) => {
    function tick() {
      const t = Math.min((performance.now() - revealStart) / revealDuration, 1);
      inSplat.opacity = t;
      u.uStaticBlend.value = 1 - t;
      glowLight.color.lerpColors(fromGlowColor, targetGlowColor, t);
      if (t < 1) setTimeout(tick, 0);
      else resolve();
    }
    setTimeout(tick, 0);
  });
}
