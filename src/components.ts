import { createComponent, Types } from '@iwsdk/core';

export const RemoteControl = createComponent('RemoteControl', {});

export const TVState = createComponent('TVState', {
  isPowered: { type: Types.Boolean, default: false },
  activeChannel: { type: Types.Int8, default: 1 },
  isTransitioning: { type: Types.Boolean, default: false },
});

export const TVScreen = createComponent('TVScreen', {});
