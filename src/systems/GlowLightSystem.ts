import { Color, createSystem, PointLight } from '@iwsdk/core';
import type { Signal } from '@preact/signals-core';
import type { TVTransitionEvent } from './TVStateSystem.js';
import { CHANNEL_CONFIG } from '../channels/channelConfig.js';

const LERP_SPEED = 2.0; // units per second

export class GlowLightSystem extends createSystem({}) {
  private glowLight!: PointLight;
  private targetIntensity = 0;
  private targetColor = new Color('#FFE8CC');
  private currentColor = new Color(0x000000);

  init() {
    this.glowLight = this.globals.glowLight as PointLight;
    this.currentColor.copy(this.glowLight.color);

    const tvEventSig = this.globals.tvEvent as Signal<TVTransitionEvent | null>;
    this.cleanupFuncs.push(
      tvEventSig.subscribe((evt) => {
        if (!evt) return;
        if (evt.type === 'powerOn' || evt.type === 'channelChange') {
          this.targetColor.set(CHANNEL_CONFIG[evt.channel - 1].glowColor);
          this.targetIntensity = 0.6;
        } else if (evt.type === 'powerOff') {
          this.targetIntensity = 0;
        }
      }),
    );
  }

  update(delta: number) {
    const t = Math.min(delta * LERP_SPEED, 1);
    this.glowLight.intensity += (this.targetIntensity - this.glowLight.intensity) * t;
    this.currentColor.lerpColors(this.currentColor, this.targetColor, t);
    this.glowLight.color.copy(this.currentColor);
  }
}
