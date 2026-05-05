import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  Vector3,
  createSystem,
} from '@iwsdk/core';
import { TVState } from '../components.js';

// World-space antenna tip positions — tune these if they don't align with the model
const LEFT_TIP = new Vector3(-0.20, 1.50, -1.68);
const RIGHT_TIP = new Vector3(0.28, 1.50, -1.68);

const BOLT_SEGMENTS = 14;

// Rainbow hues cycling over time — one per bolt
const BOLT_HUE_OFFSETS = [0.0, 0.2, 0.5, 0.7, 0.85];

function buildBoltPositions(start: Vector3, end: Vector3, jitter: number, buf: Float32Array) {
  const n = BOLT_SEGMENTS + 1;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    const z = start.z + (end.z - start.z) * t;
    // Skip jitter at endpoints to anchor the bolt
    const j = i > 0 && i < n - 1 ? jitter : 0;
    buf[i * 3] = x + (Math.random() - 0.5) * j;
    buf[i * 3 + 1] = y + (Math.random() - 0.5) * j * 0.5;
    buf[i * 3 + 2] = z + (Math.random() - 0.5) * j * 0.25;
  }
}

function createBolt(): { line: Line; buf: Float32Array } {
  const buf = new Float32Array((BOLT_SEGMENTS + 1) * 3);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(buf, 3));
  const mat = new LineBasicMaterial({
    color: new Color(),
    transparent: true,
    opacity: 0.9,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  return { line: new Line(geo, mat), buf };
}

export class AntennaeLightningSystem extends createSystem({
  tv: { required: [TVState] },
}) {
  private bolts: Array<{ line: Line; buf: Float32Array }> = [];
  private group!: Group;
  private elapsedTime = 0;
  private frameIndex = 0;

  // Pre-allocated branch endpoints
  private branchL = new Vector3();
  private branchR = new Vector3();
  private midL = new Vector3();
  private midR = new Vector3();

  init() {
    this.group = new Group();
    for (let i = 0; i < 5; i++) {
      const b = createBolt();
      this.bolts.push(b);
      this.group.add(b.line);
    }
    this.world.scene.add(this.group);
    this.group.visible = false;
  }

  update(delta: number) {
    this.elapsedTime += delta;
    this.frameIndex++;

    const tvEntity = this.queries.tv.entities.values().next().value;
    if (!tvEntity) return;

    const isPowered = tvEntity.getValue(TVState, 'isPowered') as boolean;
    if (!isPowered) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;

    // Update colors every frame (cheap), geometry every other frame
    this.updateColors();
    if (this.frameIndex % 2 === 0) {
      this.updateGeometry();
    }
  }

  private updateColors() {
    const t = this.elapsedTime;
    for (let i = 0; i < this.bolts.length; i++) {
      const hue = (t * 0.4 + BOLT_HUE_OFFSETS[i]) % 1.0;
      const mat = this.bolts[i].line.material as LineBasicMaterial;
      mat.color.setHSL(hue, 1.0, 0.65);
      // Flicker opacity for a sparking effect
      mat.opacity = 0.5 + Math.random() * 0.5;
    }
  }

  private updateGeometry() {
    // Bolt 0: main arc left tip → right tip
    this.writeBolt(0, LEFT_TIP, RIGHT_TIP, 0.09);

    // Bolt 1: second arc, more jittery
    this.writeBolt(1, LEFT_TIP, RIGHT_TIP, 0.16);

    // Bolt 2: branch from left tip upward-outward
    this.branchL.set(
      LEFT_TIP.x - 0.08 - Math.random() * 0.12,
      LEFT_TIP.y + 0.18 + Math.random() * 0.12,
      LEFT_TIP.z,
    );
    this.writeBolt(2, LEFT_TIP, this.branchL, 0.03);

    // Bolt 3: branch from right tip upward-outward
    this.branchR.set(
      RIGHT_TIP.x + 0.08 + Math.random() * 0.12,
      RIGHT_TIP.y + 0.18 + Math.random() * 0.12,
      RIGHT_TIP.z,
    );
    this.writeBolt(3, RIGHT_TIP, this.branchR, 0.03);

    // Bolt 4: mid-arc branching from center of main arc downward
    this.midL.set(
      (LEFT_TIP.x + RIGHT_TIP.x) / 2 + (Math.random() - 0.5) * 0.1,
      (LEFT_TIP.y + RIGHT_TIP.y) / 2 + (Math.random() - 0.5) * 0.08,
      LEFT_TIP.z,
    );
    this.midR.set(
      this.midL.x + (Math.random() - 0.5) * 0.15,
      this.midL.y - 0.12 - Math.random() * 0.10,
      LEFT_TIP.z,
    );
    this.writeBolt(4, this.midL, this.midR, 0.025);
  }

  private writeBolt(index: number, start: Vector3, end: Vector3, jitter: number) {
    const { line, buf } = this.bolts[index];
    buildBoltPositions(start, end, jitter, buf);
    const attr = line.geometry.getAttribute('position') as BufferAttribute;
    attr.needsUpdate = true;
  }
}
