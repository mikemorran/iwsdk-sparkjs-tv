import { Box3, Group, Vector3 } from '@iwsdk/core';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Target: seat bottom ~y=0, total width ~0.85m matching original
const TARGET_WIDTH = 0.85;

export async function buildArmchairMesh(): Promise<Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/gltf/armchair_low-poly.glb');
  const model = gltf.scene;

  // Scale by width to match original chair footprint
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const scale = TARGET_WIDTH / Math.max(size.x, size.z);
  model.scale.setScalar(scale);

  // Position: bottom at y=0, centered at world origin
  const box2 = new Box3().setFromObject(model);
  model.position.set(
    -(box2.min.x + box2.max.x) / 2,
    -box2.min.y,
    -(box2.min.z + box2.max.z) / 2,
  );

  const group = new Group();
  group.add(model);
  group.rotation.y = Math.PI; // face toward TV at -Z
  return group;
}
