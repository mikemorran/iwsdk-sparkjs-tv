import { createSystem, PointLight, ShaderMaterial } from '@iwsdk/core';
import type { Signal } from '@preact/signals-core';
import { TVState } from '../components.js';
import type { TVTransitionEvent } from './TVStateSystem.js';
import { ChannelRenderSystem } from './ChannelRenderSystem.js';
import { playPowerOn, playPowerOff, playChannelChange } from '../fx/tvTransition.js';

export class TVTransitionSystem extends createSystem({
  tv: { required: [TVState] },
}) {
  private screenMat!: ShaderMaterial;
  private glowLight!: PointLight;
  private channelRenderSystem!: ChannelRenderSystem;
  private prevChannelIndex = 0;

  init() {
    this.screenMat = this.globals.screenMat as ShaderMaterial;
    this.glowLight = this.globals.glowLight as PointLight;

    // ChannelRenderSystem is registered before us, so it's available here
    this.channelRenderSystem = this.world.getSystem(ChannelRenderSystem) as ChannelRenderSystem;

    const tvEventSig = this.globals.tvEvent as Signal<TVTransitionEvent | null>;
    this.cleanupFuncs.push(
      tvEventSig.subscribe((evt) => {
        if (!evt) return;
        void this.handleEvent(evt);
      }),
    );
  }

  private async handleEvent(evt: TVTransitionEvent): Promise<void> {
    const tvEntity = this.queries.tv.entities.values().next().value;

    try {
      if (evt.type === 'powerOn') {
        const splat = this.channelRenderSystem.getChannel(evt.channel - 1).splat;
        await playPowerOn(this.screenMat, splat, this.glowLight, evt.channel - 1);
      } else if (evt.type === 'powerOff') {
        const prevSplat = this.channelRenderSystem.getChannel(this.prevChannelIndex).splat;
        await playPowerOff(this.screenMat, prevSplat, this.glowLight);
      } else if (evt.type === 'channelChange') {
        const outSplat = this.channelRenderSystem.getChannel(this.prevChannelIndex).splat;
        const inSplat = this.channelRenderSystem.getChannel(evt.channel - 1).splat;
        await playChannelChange(this.screenMat, outSplat, inSplat, this.glowLight, evt.channel - 1);
        this.prevChannelIndex = evt.channel - 1;
      }
    } finally {
      if (tvEntity) {
        tvEntity.setValue(TVState, 'isTransitioning', false);
      }
      if (evt.type === 'powerOn') {
        this.prevChannelIndex = evt.channel - 1;
      }
    }
  }
}
