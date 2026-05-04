# Don't Stare At The TV Too Long — WebXR Experience Spec

**Version:** 0.1  
**Target Platform:** WebXR (VR)  
**SDK:** IWSDK (`@iwsdk/core`) + spark.js (Gaussian Splatting)  
**Experience Type:** Stationary VR ambient experience

---

## 1. Overview

The player finds themselves in a small, circular room lit in soft liminal-space pastels. At the center sits an armchair facing an old-fashioned CRT television with rabbit-ear antennas. A remote control rests on the right arm of the chair.

The player can pick up the remote using the IWSDK grab system. Using the remote they can power the TV on or off, and cycle through 6 channels. Each channel renders a fully immersive Gaussian splat world — powered by spark.js — contained within the TV screen itself. The screen feels like a portal into another dimension, but the player cannot enter it. Transitioning between channels and toggling the power state uses spark.js shader dissolve/reveal effects.

This is a seated, stationary experience. No locomotion is required or enabled.

---

## 2. Design Goals

- Create an atmospheric, liminal-space mood through soft pastel geometry and quiet lighting.
- Keep the player stationary; no locomotion is needed or supported.
- Use IWSDK's built-in grab system for remote control pickup — no custom input handling required.
- Use IWSDK's custom ECS system architecture for all TV channel, power, and transition logic.
- Use spark.js (`SplatMesh`) to render Gaussian splat worlds within a `WebGLRenderTarget` projected onto the TV screen plane.
- Use spark.js shader effects (dissolve/reveal) to transition between channels and on/off states.
- Make the channel system data-driven so assets can be swapped without changing code.
- Keep the first version scoped: no gaze-tracking mechanic, no progression, no locomotion.

---

## 3. Player Experience

1. Player opens the page and sees a pre-VR landing screen with the title "Don't Stare At The TV Too Long" in soft pastel styling.
2. Player presses "Enter VR."
3. Player is positioned in the circular room, seated perspective facing the TV.
4. TV is off. Room is quiet. Remote sits on the right armrest of the chair.
5. Player reaches out and grabs the remote with the grip/squeeze input.
6. Player points the remote at the TV and presses trigger to power it on.
7. TV powers on with a CRT-style reveal effect. Channel 1 plays inside the TV screen.
8. Player presses trigger again to cycle to the next channel. A static-flash transition plays.
9. Player can cycle through channels 1–6, looping back to 1.
10. Player can power off the TV by squeezing the grip while holding the remote (see §6).
11. TV powers off with a CRT-collapse dissolve effect.
12. Experience has no defined end state — the player simply exists in the room.

---

## 4. Project Setup

### 4.1 Scaffolding

Bootstrap with the IWSDK CLI:

```bash
npm create @iwsdk@latest
```

Answers to CLI prompts:

| Prompt | Answer |
|---|---|
| Language | TypeScript |
| Experience type | Virtual Reality |
| Enable hand tracking | Optional |
| Enable WebXR Layers | Optional |
| Enable locomotion | **No** |
| Enable grabbing | **Yes** |
| Enable physics simulation | **No** |
| Meta Spatial Editor | **No** |

### 4.2 Additional Dependencies

After scaffolding, install spark.js:

```bash
npm install @sparkjsdev/spark
```

spark.js requires Three.js, which IWSDK already provides. Do not install a second copy of Three.js. Import `three` via the existing module resolution in IWSDK's Vite config.

### 4.3 Entry Point

The IWSDK scaffolded project produces `src/index.ts` as the application entry point. All world setup, asset registration, entity spawning, and system registration happens there.

---

## 5. Pre-VR Landing Screen

Before the WebXR session starts, display a full-screen HTML overlay in the same liminal pastel aesthetic as the room.

### 5.1 Visual Style

- **Background:** warm gradient from cream `#FAF0E6` to muted sky blue `#B8D4E8`
- **Title:** `"Don't Stare At The TV Too Long"` — large, centered, desaturated mauve `#C4A8BE`, soft rounded font (e.g. Google Fonts: "Nunito" or "DM Sans"), light weight, generous letter-spacing
- **Subtitle:** `"Put on your headset and press Enter VR"` — smaller, warm gray `#9E9E9E`
- **Enter VR button:** pill-shaped, soft coral `#E8B4A0`, white label, subtle box-shadow; hover deepens to `#D9987A`
- **Decorative element:** faint SVG CRT television silhouette behind the title, low opacity (~15%), same mauve tone

### 5.2 Behavior

- The Enter VR button initiates the IWSDK WebXR session (`SessionMode.ImmersiveVR`).
- If WebXR is not supported, replace the button with: `"Open in a WebXR-compatible browser to experience this"` in the same soft styling.
- On desktop (no headset), the experience loads in flat-screen mode using IWSDK's built-in emulation — no special handling needed.
- Once the XR session begins, hide the landing screen overlay (`display: none`).

---

## 6. Environment: The Room

### 6.1 Coordinate Assumptions

Standard Three.js/WebXR orientation:

- Player origin at world `(0, 0, 0)`.
- Player faces positive Z axis (toward the TV).
- X axis is left/right.
- Y axis is up/down.

### 6.2 Room Geometry

| Property | Value |
|---|---|
| Shape | Circular cylinder |
| Radius | 3.5m |
| Wall height | 3.2m |
| Ceiling | Flat disc cap (slightly domed with SphereGeometry hemisphere) |
| Floor | Flat disc, radius 3.5m |

The room is fully enclosed — no doors, no windows. The only "outside" visible is through the TV screen.

### 6.3 Liminal Pastel Color Palette

Reference: the attached concept image. Colors are soft, slightly desaturated, warm-shifted.

| Surface | Color | Hex |
|---|---|---|
| Rear wall arc (behind TV) | Soft mauve | `#D4B8CE` |
| Left wall arc | Warm peach | `#F2D5C4` |
| Right wall arc | Pale sky | `#C2D9E8` |
| Floor | Creamy white | `#EDE8DC` |
| Ceiling | Warm off-white | `#F5F0EA` |

Apply colors using vertex colors or segmented wall panels with individual `MeshStandardMaterial` instances to blend the pastel gradient around the circle.

### 6.4 Lighting

| Light | Type | Color | Intensity |
|---|---|---|---|
| Ambient | `AmbientLight` | `#FFF5E4` | 0.7 |
| Directional | `DirectionalLight` | `#FFE8CC` | 0.4 |
| TV glow (dynamic) | `PointLight` | Per-channel (see §9.3) | 0 when off, 0.6 when on |

- The TV glow `PointLight` is positioned just in front of the TV screen and animates color/intensity on channel change and power toggle.
- No harsh shadows. Keep `castShadow: false` for performance, or use very low-resolution shadow maps on the armchair only.

### 6.5 Main Object Positions

| Object | Position | Notes |
|---|---|---|
| Player origin | `(0, 0, 0)` | Seated eye-level. Player faces `+Z`. |
| Armchair center | `(0, 0, 0.4)` | Chair centered slightly behind player, facing TV. |
| TV stand center | `(0, 0.35, 2.8)` | Short cabinet beneath TV. |
| TV body center | `(0, 0.88, 2.8)` | CRT television sitting on the stand. |
| TV screen plane | `(0, 0.88, 2.82)` | Slightly proud of the TV front face. |
| Remote control | `(0.38, 0.72, 0.2)` | Resting on right armrest of chair. |

---

## 7. Objects

All objects are Three.js procedural geometry for v0.1. GLTF assets can replace them in a later pass without changing system code.

### 7.1 Armchair

| Property | Value |
|---|---|
| Seat | Box, ~0.75m wide × 0.45m deep × 0.45m high |
| Backrest | Box, ~0.75m wide × 0.55m tall × 0.15m deep |
| Armrests | Two boxes, ~0.12m wide × 0.55m tall × 0.55m deep |
| Legs | Four small boxes |
| Material | `MeshStandardMaterial`, muted sage green `#A8C4A2`, roughness 0.9 |

The player camera is positioned above and behind the chair to simulate a seated perspective.

### 7.2 Television

| Property | Value |
|---|---|
| Casing | Box, ~0.7m wide × 0.6m tall × 0.45m deep |
| Material (casing) | `MeshStandardMaterial`, warm cream `#E8E0D0`, roughness 0.8 |
| Screen bezel inset | 0.05m on all sides from the front face |
| Screen plane | `PlaneGeometry`, ~0.52m × 0.4m, flush with front face |
| Antennas | Two `CylinderGeometry` rods, radius 0.005m, length 0.35m, angled ~30° outward from top corners |
| Stand/cabinet | Box, ~0.8m wide × 0.35m tall × 0.4m deep, same cream material |

The screen plane is the primary visual output surface. Its material is driven by the `TVRenderTarget` texture (see §10).

When the TV is off:
- Screen material: `MeshStandardMaterial`, color `#111111`, emissive `#000000` (flat black)
- A faint canvas-generated scanline noise texture is blended on at ~15% opacity

### 7.3 Remote Control

| Property | Value |
|---|---|
| Body | Box, ~0.05m × 0.015m × 0.18m |
| Material | `MeshStandardMaterial`, dark charcoal `#2A2A2A`, roughness 0.7 |
| Power button (visual) | Small red cylinder at top of surface |
| Channel buttons (visual) | Six small pale gray cylinders in a 2×3 grid below the power button |

Visual buttons are non-interactive geometry. All interaction is handled by the IWSDK grab system and the `RemoteSystem` (see §12).

The remote is the only grabbable object in the scene. It starts at its rest position on the right armrest.

---

## 8. Controls

### 8.1 Core Controls

| Action | Input |
|---|---|
| Pick up remote | Grip / squeeze |
| Release remote | Release grip / squeeze |
| Power on / cycle channel | Trigger (while holding remote) |
| Power off | Grip squeeze (secondary, while holding remote) |

Trigger while TV is off → power on (Channel 1).  
Trigger while TV is on → cycle to next channel.  
Grip squeeze while holding remote and TV is on → power off.

### 8.2 IWSDK Input Intent

- Use IWSDK's built-in `grabbing` feature for remote pickup. Register the remote entity with `OneHandGrabbable` and `Interactable`.
- Trigger and squeeze input states are read each frame in the `RemoteSystem` via the IWSDK XR input / gamepad API (see IWSDK Concepts: XR Input).
- Remote drops return it to the rest position on the armrest (see §8.3).

### 8.3 Remote Drop Behavior

When the player releases the remote:

1. Remote detaches from the hand.
2. Remote returns to its original armrest rest position.
3. Remote resets to its original rest rotation.
4. Remote becomes available to grab again.

Return can be instantaneous for v0.1. A short smooth tween is preferred if easy.

### 8.4 Desktop / Emulator Controls

IWSDK's built-in emulation (`@iwsdk/vite-plugin-dev`) provides mouse-and-keyboard emulation automatically on desktop. No additional fallback handling is needed.

---

## 9. TV State Machine

### 9.1 States

```typescript
type TVPowerState = 'OFF' | 'ON';
type ChannelIndex = 1 | 2 | 3 | 4 | 5 | 6;
```

### 9.2 Transitions

```
OFF → (trigger while holding remote) → ON [Channel 1]
ON [Channel N] → (trigger while holding remote) → ON [Channel N+1]
ON [Channel 6] → (trigger while holding remote) → ON [Channel 1]  // wraps
ON → (squeeze while holding remote) → OFF
```

No transitions are allowed while `isTransitioning` is true.

### 9.3 Channel Definitions

All 6 channels use the spark.js sample splat as a placeholder. The channel array is a plain config object so URLs and camera positions can be swapped without touching system logic.

**Placeholder splat URL (use for all 6 channels):**
```
https://sparkjs.dev/assets/splats/butterfly.spz
```

| Channel | Camera Behavior | TV Glow Color |
|---|---|---|
| 1 | Slow orbit, eye-level | Warm white `#FFE8CC` |
| 2 | Slightly elevated angle | Pale blue `#CCE4FF` |
| 3 | Low angle looking up | Soft green `#C4E8C4` |
| 4 | Close zoom | Peach `#FFD4B8` |
| 5 | Wide angle | Lavender `#D4C4E8` |
| 6 | Slow drift side-to-side | Rose `#E8C4C4` |

---

## 10. Screen Rendering (spark.js + WebGLRenderTarget)

### 10.1 Architecture

The TV screen is **not** a portal the player can walk through. The Gaussian splat world is fully contained within the TV screen plane.

Implementation:

1. Create one `WebGLRenderTarget` (`TVRenderTarget`) at `512 × 384` resolution.
2. Each channel has its own `THREE.Scene` and `THREE.PerspectiveCamera` (the "channel camera").
3. Each frame, render the active channel's scene into `TVRenderTarget`.
4. Apply `TVRenderTarget.texture` as the map on the TV screen plane's material.
5. The channel camera slowly orbits or drifts to give the sense of a living world.

### 10.2 spark.js SplatMesh Setup

Each channel scene contains one `SplatMesh`:

```typescript
import { SplatMesh } from '@sparkjsdev/spark';

const SPLAT_URL = 'https://sparkjs.dev/assets/splats/butterfly.spz';

function createChannelScene(cameraConfig: ChannelCameraConfig) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 512 / 384, 0.1, 100);
  camera.position.set(...cameraConfig.position);
  camera.lookAt(...cameraConfig.lookAt);

  const splat = new SplatMesh({ url: SPLAT_URL });
  splat.position.set(0, 0, -3);
  scene.add(splat);

  return { scene, camera, splat };
}
```

### 10.3 Render Loop Integration

IWSDK uses Three.js under the hood with `renderer.setAnimationLoop`. Render the TV target before the main scene each frame:

```typescript
// Inside the animation loop:
renderer.setRenderTarget(tvRenderTarget);
renderer.render(activeChannel.scene, activeChannel.camera);
renderer.setRenderTarget(null);
// IWSDK then renders the main room scene normally
```

### 10.4 Loading State

`SplatMesh` loads asynchronously. While loading:

- Show a canvas-generated noise/static texture on the screen plane.
- Replace with the render target texture once the splat is ready.

---

## 11. spark.js Shader Transitions

spark.js provides a shader graph system for real-time splat effects. Use the **dissolve/reveal** effect available in the spark.js examples (`Splat Dissolve Effects` and `Splat Transitions` at `https://sparkjs.dev/examples/`) for all TV transitions.

> **Implementation note for Claude Code:** Inspect the spark.js dissolve and transitions examples during implementation. Use the closest available dissolve/reveal shader graph API from spark.js v0.1.10. The spec describes intent; exact API calls should follow those examples directly.

### 11.1 Power On

1. Screen flickers — three rapid opacity pulses at 80ms intervals.
2. Horizontal scanline wipe: bright white line sweeps top-to-bottom over 200ms (UV-based uniform on the screen `ShaderMaterial`).
3. Splat reveals in using spark.js dissolve/reveal effect over 800ms.
4. TV glow `PointLight` fades in over 600ms, color animating to the channel's glow color.

### 11.2 Power Off

1. Splat dissolves out using spark.js dissolve effect over 400ms.
2. CRT phosphor collapse: screen brightness squashes vertically toward center, then cuts to black. Implement as a `collapse` uniform on a custom `ShaderMaterial` for the screen plane, driving a UV vertical squash over 300ms.
3. TV glow `PointLight` intensity fades to 0 over 300ms.

### 11.3 Channel Change

Total transition time: ~700ms.

1. **0ms:** Canvas noise/static texture crossfades in over 150ms.
2. **150ms:** Outgoing splat dissolves out (spark.js dissolve), duration 300ms.
3. **300ms:** Incoming splat reveals in (spark.js reveal), duration 400ms.
4. **700ms:** Static fades out; new channel fully visible.
5. TV glow `PointLight` color animates to new channel's glow color over 600ms using `THREE.Color.lerp`.

---

## 12. IWSDK ECS Architecture

### 12.1 Components

```typescript
import { createComponent, Types } from '@iwsdk/core';

// Tag: marks the remote control entity
export const RemoteControl = createComponent('RemoteControl', {});

// TV state: tracks power and active channel
export const TVState = createComponent('TVState', {
  isPowered: { type: Types.Boolean, default: false },
  activeChannel: { type: Types.Int8, default: 1 },
  isTransitioning: { type: Types.Boolean, default: false },
});

// Tag: marks the TV screen entity
export const TVScreen = createComponent('TVScreen', {});
```

### 12.2 Systems

| System | Responsibility |
|---|---|
| `RemoteSystem` | Reads trigger/squeeze input when remote is held. Dispatches power and channel events. |
| `TVStateSystem` | Owns the TV state machine. Reacts to input events, updates `TVState`. |
| `ChannelRenderSystem` | Renders the active channel scene to `TVRenderTarget` each frame. Animates channel cameras. |
| `TVTransitionSystem` | Orchestrates spark.js dissolve/reveal effects, screen shader uniforms, and glow light animation. |
| `GlowLightSystem` | Animates the `PointLight` color and intensity based on TV state and active channel. |

### 12.3 RemoteSystem

```typescript
export class RemoteSystem extends createSystem({
  remoteHeld: { required: [RemoteControl, Grabbed] }, // IWSDK Grabbed component
}) {
  update(delta: number) {
    this.queries.remoteHeld.entities.forEach((entity) => {
      // Read XR controller trigger/squeeze via IWSDK XRInput / gamepad API
      if (triggerDownThisFrame) {
        this.world.dispatch('remote:trigger');
      }
      if (squeezeDownThisFrame) {
        this.world.dispatch('remote:squeeze');
      }
    });
  }
}
```

> Refer to IWSDK Concepts: XR Input and the gamepad API for reading trigger/squeeze per-frame state from the active controller.

### 12.4 TVStateSystem

```typescript
export class TVStateSystem extends createSystem({
  tv: { required: [TVState] },
}) {
  init() {
    this.world.on('remote:trigger', () => {
      this.queries.tv.entities.forEach((entity) => {
        const state = entity.getMutableComponent(TVState);
        if (state.isTransitioning) return;

        if (!state.isPowered) {
          state.isPowered = true;
          state.activeChannel = 1;
          this.world.dispatch('tv:powerOn');
        } else {
          state.activeChannel = (state.activeChannel % 6) + 1;
          this.world.dispatch('tv:channelChange', { channel: state.activeChannel });
        }
      });
    });

    this.world.on('remote:squeeze', () => {
      this.queries.tv.entities.forEach((entity) => {
        const state = entity.getMutableComponent(TVState);
        if (!state.isPowered || state.isTransitioning) return;
        state.isPowered = false;
        this.world.dispatch('tv:powerOff');
      });
    });
  }
}
```

### 12.5 System Registration

```typescript
world
  .registerComponent(RemoteControl)
  .registerComponent(TVState)
  .registerComponent(TVScreen);

world
  .registerSystem(RemoteSystem)
  .registerSystem(TVStateSystem)
  .registerSystem(ChannelRenderSystem)
  .registerSystem(TVTransitionSystem)
  .registerSystem(GlowLightSystem);
```

### 12.6 Entity Spawning

```typescript
// Remote control — the only grabbable object
const remoteMesh = buildRemoteMesh();
world
  .createTransformEntity(remoteMesh)
  .addComponent(RemoteControl)
  .addComponent(Interactable)
  .addComponent(OneHandGrabbable, { translate: true, rotate: true });

// TV entity — owns TVState
const tvMesh = buildTVMesh();
world
  .createTransformEntity(tvMesh)
  .addComponent(TVState)
  .addComponent(TVScreen);

// Room geometry — no ECS components, plain Three.js scene children
scene.add(buildRoomMesh());
scene.add(buildArmchairMesh());
```

---

## 13. Audio

Audio is optional for v0.1. Architect with a no-op-safe `SoundManager`.

Use `THREE.PositionalAudio` attached to the TV entity for spatial sound.

| Event | Sound Description |
|---|---|
| TV power on | Electrical hum + CRT pop |
| TV power off | CRT phosphor whine + click |
| Channel change | Static burst, ~150ms |
| Remote pickup | Soft plastic click |
| Ambient (TV on) | Faint low electrical hum |

Place audio files in `public/audio/`. If files are absent, `SoundManager` no-ops gracefully.

---

## 14. File Structure

```
/
├── src/
│   ├── index.ts                    # World setup, entity spawning, system registration
│   ├── components.ts               # RemoteControl, TVState, TVScreen definitions
│   ├── systems/
│   │   ├── RemoteSystem.ts         # Trigger/squeeze input → dispatched events
│   │   ├── TVStateSystem.ts        # TV state machine
│   │   ├── ChannelRenderSystem.ts  # spark.js render target per frame
│   │   ├── TVTransitionSystem.ts   # spark.js dissolve/reveal effects
│   │   ├── GlowLightSystem.ts      # PointLight color/intensity animation
│   │   └── GazeTimerSystem.ts      # STUB — empty, reserved for future mechanic
│   ├── channels/
│   │   └── channelConfig.ts        # Channel URL, camera config, glow color (data only)
│   ├── scene/
│   │   ├── room.ts                 # Circular room geometry + materials
│   │   ├── armchair.ts             # Armchair procedural geometry
│   │   ├── television.ts           # TV body, screen plane, antennas, stand
│   │   └── remote.ts               # Remote control geometry
│   ├── fx/
│   │   ├── tvTransition.ts         # Power on/off + channel change orchestration
│   │   └── screenShader.ts         # Custom ShaderMaterial (collapse uniform, static noise)
│   └── audio/
│       └── soundManager.ts         # PositionalAudio setup, no-ops if files absent
├── public/
│   └── audio/                      # Optional audio files (.mp3 / .ogg)
├── index.html                      # HTML entry point + landing screen overlay
├── vite.config.ts                  # IWSDK Vite plugins
├── package.json
└── tsconfig.json
```

---

## 15. Technical Implementation Notes

### For Claude Code

- **Bootstrap with `npm create @iwsdk@latest`** using the answers in §4.1. Do not set up a raw Three.js + WebXR project manually — use the IWSDK scaffold.
- **Start with the room geometry and landing screen** before spark.js integration. Establish the scene, lighting, armchair, TV mesh, and remote first.
- **The TVRenderTarget is the most complex part.** Get a single channel rendering correctly to the screen plane before building the full channel system or transitions.
- **spark.js `SplatMesh` loads asynchronously.** Show a static/noise canvas texture on the screen while loading. Replace it once the splat is ready.
- **Do not enable locomotion.** Do not register `LocomotionEnvironment` on any mesh or enable `locomotion: true` in `World.create`. This is a stationary experience.
- **The remote is the only grabbable object.** No other objects need `OneHandGrabbable` or `Interactable`.
- **IWSDK's built-in emulation handles desktop testing.** Run `npm run dev`. The in-browser XR emulator works automatically — no headset needed during development.
- **Channel config is a plain array** in `channelConfig.ts`. All 6 entries point to the same placeholder splat URL for v0.1. Do not hardcode channel behavior into systems.
- **The "Don't Stare Too Long" mechanic is not implemented in v0.1.** Create `GazeTimerSystem.ts` as an empty stub with a `// TODO: implement gaze tracking` comment.
- **spark.js version is 0.1.10.** Install via `npm install @sparkjsdev/spark`. Import `SplatMesh` from `@sparkjsdev/spark`. Use the npm package — not a CDN importmap.
- **Three.js is provided by IWSDK.** Do not install a separate Three.js. IWSDK's Vite config resolves it correctly.
- **For dissolve/reveal effects:** read the spark.js examples at `https://sparkjs.dev/examples/` during implementation (`Splat Dissolve Effects`, `Splat Transitions`). Follow those examples exactly for v0.1.10 API calls.

---

## 16. Acceptance Criteria

### 16.1 Landing Screen

- Title "Don't Stare At The TV Too Long" displays in soft pastel styling before VR session starts.
- "Enter VR" button launches the IWSDK WebXR session.
- Overlay hides once VR session begins.

### 16.2 Room

- Circular pastel room is visible with armchair, TV (with antennas), and remote control correctly positioned.
- TV is off by default (flat black screen with faint static).

### 16.3 Remote Interaction

- Player can grab the remote using grip/squeeze.
- Releasing the remote returns it to the armrest rest position.
- Trigger while holding remote and TV is off → TV powers on (Channel 1).
- Trigger while holding remote and TV is on → cycles to next channel (1→2→3→4→5→6→1).
- Squeeze while holding remote and TV is on → TV powers off.
- No input is accepted while a transition is in progress (`isTransitioning` is true).

### 16.4 TV Screen

- TV screen renders the active channel's Gaussian splat world inside the screen plane.
- The splat world is fully contained within the screen — player cannot enter it.
- Screen updates in real-time each frame.
- When TV is off, screen displays flat black with faint static texture.

### 16.5 Transitions

- Power on: CRT reveal effect (flicker + scanline wipe + spark.js reveal) plays correctly.
- Power off: CRT collapse effect (spark.js dissolve + vertical squash) plays correctly.
- Channel change: static flash + spark.js dissolve out + spark.js reveal in plays correctly.
- TV glow `PointLight` color and intensity animate correctly on all state changes.

---

## 17. Out of Scope for v0.1

- "Don't Stare Too Long" gaze-based mechanic (stub only).
- Locomotion of any kind (teleport, smooth, snap turn).
- Entering the TV world / walking through the screen.
- Per-channel distinct splat assets (all channels use the same placeholder).
- Haptic feedback.
- Spatial UI panels (UIKitML).
- Multiplayer.
- Physics simulation.
- GLTF model replacement for room objects.
- Full art pass.

---

## 18. Future Enhancements

- Swap placeholder splat URLs with distinct per-channel Gaussian splat worlds.
- "Don't Stare Too Long" mechanic: prolonged gaze triggers subtle room distortion or visual changes.
- GLTF model replacement for armchair, TV, and remote.
- Haptic feedback on remote grab, button press, and channel change.
- Ambient spatial audio per channel.
- Spatial UI panel (UIKitML) floating near the player with channel indicator.
- Liminal space environmental detail: wallpaper patterns, floor texture, subtle objects.

---

## 19. Open Questions

No blocking questions for v0.1.

Confirmed decisions:

- Player is stationary. No locomotion.
- Remote is the only interactive object.
- Trigger cycles channels; squeeze powers off.
- All 6 channels use the same placeholder splat for v0.1.
- spark.js dissolve/reveal handles all TV transitions.
- The "Don't Stare Too Long" mechanic is deferred — stub only.
