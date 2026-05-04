import { CanvasTexture, createSystem, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import type { Signal } from '@preact/signals-core';
import { TVState } from '../components.js';

const W = 512;
const H = 256;

function makeDebugCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tex = new CanvasTexture(canvas);
  return { canvas, ctx, tex };
}

function drawDebug(
  ctx: CanvasRenderingContext2D,
  tex: CanvasTexture,
  isPowered: boolean,
  activeChannel: number,
  isTransitioning: boolean,
  remoteHeld: boolean,
  powerToggleCount: number,
  channelNextCount: number,
): void {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(8, 8, W - 16, H - 16);

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#00FF88';
  ctx.fillText('TV DEBUG', 24, 42);

  ctx.font = '20px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`powered:      ${isPowered ? 'ON' : 'OFF'}`, 24, 80);
  ctx.fillText(`channel:      ${activeChannel}`, 24, 108);
  ctx.fillText(`transitioning:${isTransitioning ? 'YES' : 'no'}`, 24, 136);

  ctx.fillStyle = '#AADDFF';
  ctx.fillText(`remote held:  ${remoteHeld ? 'YES' : 'no'}`, 24, 172);
  ctx.fillText(`[A] power toggles: ${powerToggleCount}`, 24, 200);
  ctx.fillText(`[B] ch advances:   ${channelNextCount}`, 24, 228);

  tex.needsUpdate = true;
}

export class DebugOverlaySystem extends createSystem({
  tv: { required: [TVState] },
}) {
  private ctx!: CanvasRenderingContext2D;
  private tex!: CanvasTexture;
  private powerToggleCount = 0;
  private channelNextCount = 0;

  init() {
    const { ctx, tex } = makeDebugCanvas();
    this.ctx = ctx;
    this.tex = tex;

    const geo = new PlaneGeometry(0.55, 0.28);
    const mat = new MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(0, 1.7, -1.47);
    this.world.scene.add(mesh);

    const powerToggleSig = this.globals.remotePowerToggle as Signal<number>;
    const channelNextSig = this.globals.remoteChannelNext as Signal<number>;

    this.cleanupFuncs.push(
      powerToggleSig.subscribe((n) => { if (n > 0) this.powerToggleCount++; }),
      channelNextSig.subscribe((n) => { if (n > 0) this.channelNextCount++; }),
    );
  }

  update() {
    const tvEntity = this.queries.tv.entities.values().next().value;
    if (!tvEntity) return;

    const isPowered = tvEntity.getValue(TVState, 'isPowered') as boolean;
    const activeChannel = tvEntity.getValue(TVState, 'activeChannel') as number;
    const isTransitioning = tvEntity.getValue(TVState, 'isTransitioning') as boolean;
    const remoteHeld = (this.globals.remoteHeld as Signal<boolean>).peek();

    drawDebug(
      this.ctx, this.tex,
      isPowered, activeChannel, isTransitioning,
      remoteHeld, this.powerToggleCount, this.channelNextCount,
    );
  }
}
