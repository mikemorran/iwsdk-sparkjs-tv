import {
  Color,
  createSystem,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  WebGLRenderTarget,
} from '@iwsdk/core';
import { SplatMesh, SparkRenderer } from '@sparkjsdev/spark';
import type { Signal } from '@preact/signals-core';
import { TVState } from '../components.js';
import { CHANNEL_CONFIG, type ChannelConfig } from '../channels/channelConfig.js';
import type { TVTransitionEvent } from './TVStateSystem.js';

export interface ChannelScene {
  scene: Scene;
  camera: PerspectiveCamera;
  splat: SplatMesh;
  sparkRenderer: SparkRenderer;
  config: ChannelConfig;
}

function createChannelScene(config: ChannelConfig, sparkRenderer: SparkRenderer): ChannelScene {
  const scene = new Scene();
  scene.background = new Color('#050505');
  const camera = new PerspectiveCamera(60, 512 / 384, 0.1, 100);
  camera.position.set(...config.cameraPosition);
  camera.lookAt(...config.cameraLookAt);

  const splat = new SplatMesh({ url: config.url });
  if (config.splatRotation) splat.rotation.set(...config.splatRotation);
  splat.opacity = 0; // Hidden via opacity; visible=true so SparkRenderer can accumulate data
  scene.add(splat);
  scene.add(sparkRenderer);

  return { scene, camera, splat, sparkRenderer, config };
}

function animateChannelCamera(ch: ChannelScene, elapsed: number): void {
  const { camera, config } = ch;
  const [bx, by, bz] = config.cameraPosition;
  const lookAt = config.cameraLookAt;
  const t = elapsed * 0.3;

  switch (config.cameraMode) {
    case 'orbit': {
      const r = Math.sqrt(bx * bx + bz * bz) || 2.2;
      camera.position.x = Math.sin(t * 0.4) * r;
      camera.position.y = by;
      camera.position.z = Math.cos(t * 0.4) * r;
      camera.lookAt(...lookAt);
      break;
    }
    case 'elevated': {
      camera.position.y = by + Math.sin(t * 0.2) * 0.3;
      camera.lookAt(...lookAt);
      break;
    }
    case 'lowAngle': {
      camera.position.y = by + Math.sin(t * 0.15) * 0.15;
      camera.lookAt(...lookAt);
      break;
    }
    case 'closeZoom': {
      camera.position.z = bz + Math.sin(t * 0.25) * 0.15;
      camera.lookAt(...lookAt);
      break;
    }
    case 'wideAngle': {
      camera.position.z = bz + Math.sin(t * 0.2) * 0.3;
      camera.lookAt(...lookAt);
      break;
    }
    case 'sideDrift': {
      camera.position.x = Math.sin(t * 0.35) * 1.2;
      camera.position.z = bz;
      camera.lookAt(...lookAt);
      break;
    }
  }
}

export class ChannelRenderSystem extends createSystem({
  tv: { required: [TVState] },
}) {
  private tvRenderTarget!: WebGLRenderTarget;
  private channels!: ChannelScene[];
  private screenMesh!: Mesh;
  private screenMat!: ShaderMaterial;
  private elapsedTime = 0;
  private activeChannelIndex = 0;

  init() {
    this.tvRenderTarget = new WebGLRenderTarget(512, 384);

    // Each channel gets its own SparkRenderer (required for GPU splat rendering)
    this.channels = CHANNEL_CONFIG.map((cfg) => {
      const sparkRenderer = new SparkRenderer({ renderer: this.renderer });
      const ch = createChannelScene(cfg, sparkRenderer);
      // Ensure SparkRenderer sorts splats for the channel camera, not the XR headset camera.
      // Without this, the sort order is driven by the headset position and causes black patches
      // on splats when the viewer is close to the TV screen.
      ch.sparkRenderer.viewpoint.camera = ch.camera;
      return ch;
    });

    this.screenMesh = this.globals.screenMesh as Mesh;
    this.screenMat = this.globals.screenMat as ShaderMaterial;

    // Track channel changes to update active index
    const tvEventSig = this.globals.tvEvent as Signal<TVTransitionEvent | null>;
    this.cleanupFuncs.push(
      tvEventSig.subscribe((evt) => {
        if (!evt) return;
        if (evt.type === 'powerOn' || evt.type === 'channelChange') {
          this.activeChannelIndex = evt.channel - 1;
        }
      }),
    );
  }

  update(delta: number) {
    this.elapsedTime += delta;

    // Always advance uTime so animated static plays during transitions even when off
    const screenUniforms = this.screenMat.uniforms as Record<string, { value: unknown }>;
    screenUniforms['uTime'].value = this.elapsedTime;

    const tvEntity = this.queries.tv.entities.values().next().value;
    if (!tvEntity) return;

    const isPowered = tvEntity.getValue(TVState, 'isPowered') as boolean;
    if (!isPowered) return;

    const ch = this.channels[this.activeChannelIndex];
    animateChannelCamera(ch, this.elapsedTime);

    // Camera is in a standalone scene so Three.js won't auto-update its matrices
    ch.camera.updateMatrixWorld();

    // Render active channel splat scene to TV render target.
    // xr.enabled=false prevents xr.updateCamera() from corrupting the channel
    // camera's matrixWorld and projectionMatrix with the headset's transforms.
    const { renderer } = this;
    const xr = renderer.xr;
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.tvRenderTarget);
    xr.enabled = false;
    renderer.render(ch.scene, ch.camera);
    xr.enabled = true;
    renderer.setRenderTarget(prevTarget);

    // Update screen shader texture
    screenUniforms['uTexture'].value = this.tvRenderTarget.texture;
  }

  // Expose channels so TVTransitionSystem can access splats
  getChannel(index: number): ChannelScene {
    return this.channels[index];
  }

  getChannels(): ChannelScene[] {
    return this.channels;
  }
}
