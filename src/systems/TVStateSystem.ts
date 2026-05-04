import { createSystem } from '@iwsdk/core';
import type { Signal } from '@preact/signals-core';
import { TVState } from '../components.js';

export interface TVTransitionEvent {
  type: 'powerOn' | 'powerOff' | 'channelChange';
  channel: number;
  id: number;
}

let _eventId = 0;

export class TVStateSystem extends createSystem({
  tv: { required: [TVState] },
}) {
  init() {
    const powerToggleSig = this.globals.remotePowerToggle as Signal<number>;
    const channelNextSig = this.globals.remoteChannelNext as Signal<number>;
    const tvEventSig = this.globals.tvEvent as Signal<TVTransitionEvent | null>;

    this.cleanupFuncs.push(
      powerToggleSig.subscribe((n) => {
        if (n === 0) return;
        const tvEntity = this.queries.tv.entities.values().next().value;
        if (!tvEntity) return;

        const isTransitioning = tvEntity.getValue(TVState, 'isTransitioning') as boolean;
        if (isTransitioning) return;

        const isPowered = tvEntity.getValue(TVState, 'isPowered') as boolean;

        if (!isPowered) {
          tvEntity.setValue(TVState, 'isPowered', true);
          tvEntity.setValue(TVState, 'activeChannel', 1);
          tvEntity.setValue(TVState, 'isTransitioning', true);
          tvEventSig.value = { type: 'powerOn', channel: 1, id: ++_eventId };
        } else {
          tvEntity.setValue(TVState, 'isPowered', false);
          tvEntity.setValue(TVState, 'isTransitioning', true);
          tvEventSig.value = { type: 'powerOff', channel: 0, id: ++_eventId };
        }
      }),
    );

    this.cleanupFuncs.push(
      channelNextSig.subscribe((n) => {
        if (n === 0) return;
        const tvEntity = this.queries.tv.entities.values().next().value;
        if (!tvEntity) return;

        const isPowered = tvEntity.getValue(TVState, 'isPowered') as boolean;
        const isTransitioning = tvEntity.getValue(TVState, 'isTransitioning') as boolean;
        if (!isPowered || isTransitioning) return;

        const current = tvEntity.getValue(TVState, 'activeChannel') as number;
        const next = (current % 6) + 1;
        tvEntity.setValue(TVState, 'activeChannel', next);
        tvEntity.setValue(TVState, 'isTransitioning', true);
        tvEventSig.value = { type: 'channelChange', channel: next, id: ++_eventId };
      }),
    );
  }
}
