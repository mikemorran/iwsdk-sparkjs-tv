import { CanvasTexture, createSystem, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import type { Signal } from '@preact/signals-core';
import { TVState } from '../components.js';

const W = 512;
const H = 340;

function makeDebugCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tex = new CanvasTexture(canvas);
  return { canvas, ctx, tex };
}

function drawScanlines(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}

function drawLED(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean) {
  const r = 10;
  const color = on ? '#33FF66' : '#441111';
  const glow = on ? 'rgba(50,255,100,0.5)' : 'rgba(0,0,0,0)';
  const grad = ctx.createRadialGradient(x, y, 1, x, y, r + 4);
  grad.addColorStop(0, on ? '#AAFFCC' : '#661111');
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, glow);
  ctx.beginPath();
  ctx.arc(x, y, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = on ? '#00AA44' : '#330000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawSegmentDisplay(ctx: CanvasRenderingContext2D, x: number, y: number, digit: string, active: boolean) {
  const color = active ? '#FF9900' : '#331100';
  ctx.font = `bold 52px "Courier New", monospace`;
  ctx.fillStyle = color;
  ctx.shadowColor = active ? '#FF6600' : 'transparent';
  ctx.shadowBlur = active ? 12 : 0;
  ctx.fillText(digit, x, y);
  ctx.shadowBlur = 0;
}

function drawDebug(
  ctx: CanvasRenderingContext2D,
  tex: CanvasTexture,
  isPowered: boolean,
  activeChannel: number,
  isTransitioning: boolean,
  remoteHeld: boolean,
): void {
  // Cabinet background — warm walnut dark brown
  ctx.fillStyle = '#1A0F0A';
  ctx.fillRect(0, 0, W, H);

  // Outer bezel border
  ctx.strokeStyle = '#3D2010';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // Inner CRT screen area
  const pad = 14;
  ctx.fillStyle = '#070B0A';
  ctx.fillRect(pad, pad, W - pad * 2, H - pad * 2);
  ctx.strokeStyle = '#1A3025';
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

  // Title bar
  ctx.fillStyle = '#0A1A10';
  ctx.fillRect(pad, pad, W - pad * 2, 38);
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillStyle = '#22AA55';
  ctx.letterSpacing = '4px';
  ctx.fillText('◈  DONT STARE TOO LONG  ◈', 60, 38);
  ctx.letterSpacing = '0px';

  // Divider line
  ctx.strokeStyle = '#1A4025';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, 53);
  ctx.lineTo(W - pad, 53);
  ctx.stroke();

  // POWER section
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#336644';
  ctx.fillText('POWER (A)', 40, 80);
  drawLED(ctx, 60, 100, isPowered);
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = isPowered ? '#33FF66' : '#553322';
  ctx.fillText(isPowered ? 'ON' : 'OFF', 44, 128);

  // Vertical divider
  ctx.strokeStyle = '#1A3020';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(130, 60);
  ctx.lineTo(130, H - pad - 40);
  ctx.stroke();

  // CHANNEL section
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#336644';
  ctx.fillText('CHANNEL (B)', 158, 80);
  drawSegmentDisplay(ctx, 155, 135, String(activeChannel), isPowered);

  // Second divider
  ctx.beginPath();
  ctx.moveTo(W / 2 + 30, 60);
  ctx.lineTo(W / 2 + 30, H - pad - 40);
  ctx.stroke();

  // STATUS section
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#336644';
  ctx.fillText('STATUS', W / 2 + 50, 80);

  ctx.font = '12px "Courier New", monospace';
  const statusColor = isTransitioning ? '#FFAA00' : '#22AA55';
  ctx.fillStyle = statusColor;
  ctx.shadowColor = statusColor;
  ctx.shadowBlur = isTransitioning ? 8 : 0;
  ctx.fillText(isTransitioning ? '▶ SWITCHING' : '● STABLE', W / 2 + 44, 105);
  ctx.shadowBlur = 0;

  ctx.fillStyle = remoteHeld ? '#44CCFF' : '#224433';
  ctx.fillText(remoteHeld ? '◉ REMOTE HELD' : '○ REMOTE FREE', W / 2 + 44, 128);

  // Bottom instruction strip
  ctx.fillStyle = '#0D1A10';
  ctx.fillRect(pad + 1, H - pad - 38, W - pad * 2 - 2, 38);

  ctx.strokeStyle = '#1A3020';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, H - pad - 38);
  ctx.lineTo(W - pad, H - pad - 38);
  ctx.stroke();

  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#2A6640';
  ctx.fillText('A BUTTON → POWER      B BUTTON → CH+', 36, H - pad - 16);

  drawScanlines(ctx);
  tex.needsUpdate = true;
}

export class DebugOverlaySystem extends createSystem({
  tv: { required: [TVState] },
}) {
  private ctx!: CanvasRenderingContext2D;
  private tex!: CanvasTexture;

  init() {
    const { ctx, tex } = makeDebugCanvas();
    this.ctx = ctx;
    this.tex = tex;

    const geo = new PlaneGeometry(0.90, 0.60);
    const mat = new MeshBasicMaterial({ map: tex, transparent: true });
    const mesh = new Mesh(geo, mat);
    // Position to the right of the TV, like a side control panel
    mesh.position.set(1.1, 0.4, -1.1);
    mesh.rotation.y = -0.6;
    this.world.scene.add(mesh);
  }

  update() {
    const tvEntity = this.queries.tv.entities.values().next().value;
    if (!tvEntity) return;

    const isPowered = tvEntity.getValue(TVState, 'isPowered') as boolean;
    const activeChannel = tvEntity.getValue(TVState, 'activeChannel') as number;
    const isTransitioning = tvEntity.getValue(TVState, 'isTransitioning') as boolean;
    const remoteHeld = (this.globals.remoteHeld as Signal<boolean>).peek();

    drawDebug(this.ctx, this.tex, isPowered, activeChannel, isTransitioning, remoteHeld);
  }
}
