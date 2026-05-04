import { createSystem } from '@iwsdk/core';
import { updateRoomTime } from '../scene/room.js';

export class RoomColorSystem extends createSystem({}) {
  private elapsed = 0;

  update(delta: number) {
    this.elapsed += delta;
    updateRoomTime(this.elapsed);
  }
}
