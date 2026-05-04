import { Box3, Group, Vector3 } from '@iwsdk/core';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// On top of right armrest (chair faces -Z toward TV): armrest at +X, slightly behind seat center
export const REMOTE_REST_POSITION: [number, number, number] = [0.33, 0.58, -0.17];
export const REMOTE_REST_ROTATION: [number, number, number] = [0, 0.13, 0];

// Target longest dimension to match original ~0.18m length
const TARGET_LENGTH = 0.18;

export async function buildRemoteMesh(): Promise<Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/gltf/soviet_tv_remote_control__low_poly_game_asset.glb');
  const model = gltf.scene;

  // Scale by longest axis to match original remote length
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const longest = Math.max(size.x, size.y, size.z);
  const scale = TARGET_LENGTH / longest;
  model.scale.setScalar(scale);

  // Center model at local origin
  const box2 = new Box3().setFromObject(model);
  const center = box2.getCenter(new Vector3());
  model.position.sub(center);

  const group = new Group();
  group.add(model);
  group.position.set(...REMOTE_REST_POSITION);
  group.rotation.set(...REMOTE_REST_ROTATION);

  return group;
}
