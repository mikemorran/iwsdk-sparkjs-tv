import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from '@iwsdk/core';

// On top of right armrest: armrest top y=0.74, x center=0.495, seat midpoint z=0
export const REMOTE_REST_POSITION: [number, number, number] = [0.48, 0.75, -0.16];
export const REMOTE_REST_ROTATION: [number, number, number] = [0, 3, 0];

export function buildRemoteMesh(): Group {
  const group = new Group();

  const bodyMat = new MeshStandardMaterial({ color: '#2A2A2A', roughness: 0.7 });
  const powerBtnMat = new MeshStandardMaterial({ color: '#CC2222', roughness: 0.6 });
  const channelBtnMat = new MeshStandardMaterial({ color: '#CCCCCC', roughness: 0.5 });

  // Body: 0.05w × 0.015h × 0.18d
  const body = new Mesh(new BoxGeometry(0.05, 0.015, 0.18), bodyMat);
  group.add(body);

  // Power button: small red cylinder at top (local +Z = top of remote)
  const powerBtn = new Mesh(new CylinderGeometry(0.008, 0.008, 0.006, 8), powerBtnMat);
  powerBtn.rotation.x = Math.PI / 2;
  powerBtn.position.set(0, 0.011, 0.07);
  group.add(powerBtn);

  // 6 channel buttons in a 2×3 grid below power button
  const btnOffsets: [number, number][] = [
    [-0.012, 0.04], [0.012, 0.04],
    [-0.012, 0.01], [0.012, 0.01],
    [-0.012, -0.02], [0.012, -0.02],
  ];

  for (const [x, z] of btnOffsets) {
    const btn = new Mesh(new CylinderGeometry(0.005, 0.005, 0.005, 8), channelBtnMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(x, 0.011, z);
    group.add(btn);
  }

  // Rest position per spec
  group.position.set(...REMOTE_REST_POSITION);
  group.rotation.set(...REMOTE_REST_ROTATION);

  return group;
}
