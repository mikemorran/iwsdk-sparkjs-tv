import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from '@iwsdk/core';

const CHAIR_MAT = new MeshStandardMaterial({ color: '#c2deff' });

function box(w: number, h: number, d: number, x: number, y: number, z: number): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, h, d), CHAIR_MAT);
  mesh.position.set(x, y, z);
  return mesh;
}

export function buildArmchairMesh(): Group {
  const group = new Group();

  // Seat: 0.85w × 0.52h × 0.68d
  const seat = box(0.85, 0.52, 0.68, 0, 0.26, 0);

  // Backrest: 0.85w × 0.65h × 0.18d, behind seat
  const backrest = box(0.85, 0.65, 0.18, 0, 0.52 + 0.325, 0.25);

  // Armrests: 0.14w × 0.22h × 0.72d
  const armL = box(0.14, 0.22, 0.72, -0.495, 0.52 + 0.11, 0);
  const armR = box(0.14, 0.22, 0.72, 0.495, 0.52 + 0.11, 0);

  // Four legs: 0.08 × 0.28 × 0.08
  const legBL = box(0.08, 0.28, 0.08, -0.36, -0.14, 0.28);
  const legBR = box(0.08, 0.28, 0.08, 0.36, -0.14, 0.28);
  const legFL = box(0.08, 0.28, 0.08, -0.36, -0.14, -0.28);
  const legFR = box(0.08, 0.28, 0.08, 0.36, -0.14, -0.28);

  group.add(seat, backrest, armL, armR, legBL, legBR, legFL, legFR);

  // Backrest at local +Z → world +Z (behind sitter); front of seat faces -Z toward TV
  group.position.set(0, 0, 0);

  return group;
}
