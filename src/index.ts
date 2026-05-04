import { signal } from '@preact/signals-core';
import {
  Interactable,
  OneHandGrabbable,
  SessionMode,
  VisibilityState,
  World,
} from '@iwsdk/core';

import { RemoteControl, TVScreen, TVState } from './components.js';
import { buildRoomMesh } from './scene/room.js';
import { buildArmchairMesh } from './scene/armchair.js';
import { buildTVMesh } from './scene/television.js';
import { buildRemoteMesh } from './scene/remote.js';
import { createStaticNoiseTexture, createScreenMaterial } from './fx/screenShader.js';
import { RemoteSystem } from './systems/RemoteSystem.js';
import { TVStateSystem } from './systems/TVStateSystem.js';
import { ChannelRenderSystem } from './systems/ChannelRenderSystem.js';
import { TVTransitionSystem } from './systems/TVTransitionSystem.js';
import { GlowLightSystem } from './systems/GlowLightSystem.js';
import { GazeTimerSystem } from './systems/GazeTimerSystem.js';
import { RoomColorSystem } from './systems/RoomColorSystem.js';
import { DebugOverlaySystem } from './systems/DebugOverlaySystem.js';
import type { TVTransitionEvent } from './systems/TVStateSystem.js';

const container = document.getElementById('scene-container') as HTMLDivElement;

World.create(container, {
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: 'always',
  },
  features: {
    locomotion: false,
    grabbing: true,
    physics: false,
    sceneUnderstanding: false,
  },
  render: {
    defaultLighting: false,
    fov: 75,
    near: 0.05,
    far: 50,
  },
}).then((world) => {
  // ── Cross-system signals ──────────────────────────────────────────────────
  (world.globals as Record<string, unknown>).remotePowerToggle = signal<number>(0);
  (world.globals as Record<string, unknown>).remoteChannelNext = signal<number>(0);
  (world.globals as Record<string, unknown>).tvEvent = signal<TVTransitionEvent | null>(null);
  (world.globals as Record<string, unknown>).remoteHeld = signal<boolean>(false);

  // ── Register ECS components ───────────────────────────────────────────────
  world
    .registerComponent(RemoteControl)
    .registerComponent(TVState)
    .registerComponent(TVScreen);

  // ── Scene geometry ────────────────────────────────────────────────────────
  const { group: roomGroup, ambientLight, directionalLight } = buildRoomMesh();
  const chairGroup = buildArmchairMesh();
  const { group: tvGroup, screenMesh, glowLight } = buildTVMesh();
  const remoteGroup = buildRemoteMesh();

  world.scene.add(roomGroup);
  world.scene.add(chairGroup);
  world.scene.add(tvGroup);
  world.scene.add(ambientLight);
  world.scene.add(directionalLight);

  // Build screen shader material and replace default material
  const staticTex = createStaticNoiseTexture();
  const screenMat = createScreenMaterial(staticTex);
  screenMesh.material = screenMat;

  // ── Shared refs for systems ───────────────────────────────────────────────
  (world.globals as Record<string, unknown>).screenMesh = screenMesh;
  (world.globals as Record<string, unknown>).screenMat = screenMat;
  (world.globals as Record<string, unknown>).glowLight = glowLight;

  // ── Remote entity (the only grabbable) ───────────────────────────────────
  const remoteEntity = world.createTransformEntity(remoteGroup);
  remoteEntity
    .addComponent(RemoteControl)
    .addComponent(Interactable)
    .addComponent(OneHandGrabbable, { translate: true, rotate: true });

  // ── TV entity (owns TVState) ──────────────────────────────────────────────
  world
    .createTransformEntity()
    .addComponent(TVState)
    .addComponent(TVScreen);

  // ── Register systems ──────────────────────────────────────────────────────
  world
    .registerSystem(RemoteSystem)
    .registerSystem(TVStateSystem)
    .registerSystem(ChannelRenderSystem)
    .registerSystem(TVTransitionSystem)
    .registerSystem(GlowLightSystem)
    .registerSystem(GazeTimerSystem)
    .registerSystem(RoomColorSystem)
    .registerSystem(DebugOverlaySystem);

  // ── Landing screen wiring ─────────────────────────────────────────────────
  const overlay = document.getElementById('landing-overlay');
  const enterBtn = document.getElementById('enter-vr-btn');

  if (!navigator.xr) {
    if (enterBtn) {
      const msg = document.createElement('p');
      msg.className = 'no-webxr-msg';
      msg.textContent = 'Open in a WebXR-compatible browser to experience this.';
      enterBtn.replaceWith(msg);
    }
  } else {
    enterBtn?.addEventListener('click', () => void world.launchXR());
  }

  world.visibilityState.subscribe((state) => {
    if (state !== VisibilityState.NonImmersive && overlay) {
      overlay.style.display = 'none';
    }
  });
});
