import { createSystem, InputComponent, OneHandGrabbable, Pressed, Quaternion, Vector3 } from '@iwsdk/core';
import type { Signal } from '@preact/signals-core';
import { RemoteControl } from '../components.js';
import { REMOTE_REST_POSITION } from '../scene/remote.js';
import { soundManager } from '../audio/soundManager.js';

export class RemoteSystem extends createSystem({
  remoteHeld: { required: [RemoteControl, OneHandGrabbable, Pressed] },
}) {
  private readonly restPosition = new Vector3(...REMOTE_REST_POSITION);
  private readonly restQuaternion = new Quaternion();
  private aWasDown = false;
  private bWasDown = false;

  init() {
    const remoteHeldSig = this.globals.remoteHeld as Signal<boolean>;

    this.queries.remoteHeld.subscribe('qualify', () => {
      this.aWasDown = false;
      this.bWasDown = false;
      remoteHeldSig.value = true;
    });

    this.queries.remoteHeld.subscribe('disqualify', (entity) => {
      remoteHeldSig.value = false;
      const obj = entity.object3D!;
      obj.position.copy(this.restPosition);
      obj.quaternion.copy(this.restQuaternion);
      this.aWasDown = false;
      this.bWasDown = false;
    });
  }

  update() {
    if (this.queries.remoteHeld.entities.size === 0) return;

    const left = this.input.gamepads.left;
    const right = this.input.gamepads.right;

    const aNow = !!(
      left?.getButtonPressed(InputComponent.A_Button) ||
      right?.getButtonPressed(InputComponent.A_Button)
    );
    const bNow = !!(
      left?.getButtonPressed(InputComponent.B_Button) ||
      right?.getButtonPressed(InputComponent.B_Button)
    );

    if (aNow && !this.aWasDown) {
      soundManager.playRemoteClick();
      (this.globals.remotePowerToggle as Signal<number>).value++;
    }
    if (bNow && !this.bWasDown) {
      soundManager.playRemoteClick();
      (this.globals.remoteChannelNext as Signal<number>).value++;
    }

    this.aWasDown = aNow;
    this.bWasDown = bNow;
  }
}
