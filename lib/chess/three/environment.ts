import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** A complete, quiet 3D reading room around the playable board. */
export function createRoomBackdrop() {
  const group = new T.Group();
  group.name = 'warm-reading-room';
  group.userData.wallSides = ['north', 'south', 'east', 'west'];
  const geometries: T.BufferGeometry[] = [], materials: T.Material[] = [], textures: T.Texture[] = [];
  const material = (color: string, roughness = 0.85, metalness = 0) => {
    const value = new T.MeshStandardMaterial({ color, roughness, metalness });
    materials.push(value);
    return value;
  };
  const walnut = material('#886345'), darkWalnut = material('#5c4434');
  const brass = material('#a78c56', 0.48, 0.58), ceramic = material('#d1c5ab');
  const leafMat = material('#67745a'), leafLight = material('#7f896b');
  const floorMat = material('#c8bca6'), rugMat = material('#776f5d');
  const wallMat = material('#d8ceba'), wallInset = material('#c7bba5'), fabric = material('#8b6d55');
  const bookMaterials = ['#725447', '#66705f', '#9a794d', '#5c6570', '#8b6354'].map((color) => material(color));

  const size = 256, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const wave = Math.sin(x * 0.16 + Math.sin(y * 0.021) * 2 + Math.sin(x * 0.031) * 2);
    const fine = Math.sin(x * 2.8 + Math.sin(y * 0.011) * 3);
    const value = Math.round(180 + wave * 5 + fine * 2), index = (y * size + x) * 4;
    data[index] = value; data[index + 1] = value; data[index + 2] = value; data[index + 3] = 255;
  }
  const texture = new T.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(3, 1); texture.needsUpdate = true;
  textures.push(texture); walnut.map = texture; walnut.bumpMap = texture; walnut.bumpScale = 0.007;

  function mesh(geometry: T.BufferGeometry, meshMaterial: T.Material, x: number, y: number, z: number) {
    geometries.push(geometry); const object = new T.Mesh(geometry, meshMaterial);
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; group.add(object);
    return object;
  }
  function wall(width: number, x: number, z: number, rotationY: number) {
    const object = mesh(new T.PlaneGeometry(width, 7), wallMat, x, -0.05, z);
    object.rotation.y = rotationY; object.castShadow = false; return object;
  }
  function planter(x: number, z: number, variant = 0) {
    mesh(new T.CylinderGeometry(0.28, 0.22, 0.44, 28), ceramic, x, -0.19, z);
    mesh(new T.CylinderGeometry(0.24, 0.24, 0.024, 28), darkWalnut, x, 0.04, z);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * 2.399 + variant, stemX = x + Math.cos(angle) * 0.16, stemZ = z + Math.sin(angle) * 0.15;
      mesh(new T.CylinderGeometry(0.014, 0.018, 0.58, 8), leafMat, stemX, 0.29, stemZ);
      const leaf = mesh(new T.SphereGeometry(1, 18, 12), index % 2 ? leafLight : leafMat, stemX + Math.cos(angle) * 0.13, 0.58 + (index % 3) * 0.085, stemZ + Math.sin(angle) * 0.13);
      leaf.scale.set(0.11, 0.28, 0.055); leaf.rotation.set(0.3, angle, 0.4 * Math.sin(angle));
    }
  }
  function lamp(x: number, z: number) {
    mesh(new T.CylinderGeometry(0.25, 0.28, 0.07, 28), brass, x, -0.37, z);
    mesh(new T.CylinderGeometry(0.033, 0.045, 0.7, 18), brass, x, 0, z);
    mesh(new T.CylinderGeometry(0.19, 0.4, 0.38, 32), ceramic, x, 0.52, z);
    const light = new T.PointLight('#ffd9a0', 1.1, 3, 2); light.position.set(x, 0.4, z); group.add(light);
  }

  mesh(new RoundedBoxGeometry(14, 0.38, 14, 4, 0.18), walnut, 0, -0.6, 0);
  mesh(new RoundedBoxGeometry(13.82, 0.04, 13.82, 2, 0.08), brass, 0, -0.795, 0);
  const floor = mesh(new T.PlaneGeometry(100, 100), floorMat, 0, -3.55, 0);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const rug = mesh(new T.CircleGeometry(8.4, 64), rugMat, 0, -3.52, 0);
  rug.rotation.x = -Math.PI / 2; rug.castShadow = false;
  for (const x of [-5.9, 5.9]) for (const z of [-5.9, 5.9]) mesh(new T.CylinderGeometry(0.12, 0.09, 2.8, 16), walnut, x, -2.16, z);

  // Inward-facing planes fill all camera angles while the near wall is back-face culled.
  wall(22, 0, -10, 0); wall(22, 0, 10, Math.PI);
  wall(20, -10, 0, Math.PI / 2); wall(20, 10, 0, -Math.PI / 2);
  for (const z of [-9.96, 9.96]) {
    mesh(new RoundedBoxGeometry(20, 0.18, 0.12, 2, 0.04), darkWalnut, 0, -3.32, z);
    for (const x of [-7.2, 0, 7.2]) mesh(new T.BoxGeometry(0.07, 2.2, 0.06), wallInset, x, -1.85, z);
  }
  for (const x of [-9.96, 9.96]) {
    mesh(new RoundedBoxGeometry(0.12, 0.18, 18, 2, 0.04), darkWalnut, x, -3.32, 0);
    for (const z of [-6, 0, 6]) mesh(new T.BoxGeometry(0.06, 2.2, 0.07), wallInset, x, -1.85, z);
  }

  // Window side.
  mesh(new RoundedBoxGeometry(7.8, 0.13, 0.75, 2, 0.05), ceramic, -2, 1.15, -9.65);
  const glass = new T.MeshStandardMaterial({ color: '#e8eee0', emissive: '#dedfc7', emissiveIntensity: 0.22, roughness: 0.9 });
  materials.push(glass); mesh(new T.BoxGeometry(7.25, 3.25, 0.08), glass, -2, 2.8, -9.88);
  for (const x of [-5.62, -2, 1.62]) mesh(new T.BoxGeometry(0.1, 3.35, 0.13), ceramic, x, 2.8, -9.78);
  for (const y of [1.17, 2.8, 4.43]) mesh(new T.BoxGeometry(7.35, 0.1, 0.13), ceramic, -2, y, -9.78);
  mesh(new RoundedBoxGeometry(0.5, 4.1, 0.16, 3, 0.08), fabric, -6.08, 2.75, -9.66).rotation.z = -0.05;
  mesh(new RoundedBoxGeometry(0.5, 4.1, 0.16, 3, 0.08), fabric, 2.08, 2.75, -9.66).rotation.z = 0.05;
  planter(-4.9, -4.9); lamp(4.9, -4.9);

  // Opposite side: library, varied book spines, reading chair, and second plant.
  mesh(new RoundedBoxGeometry(6.4, 2.7, 0.72, 3, 0.08), darkWalnut, 1.4, -1.86, 9.48);
  for (const y of [-2.62, -1.9, -1.18]) mesh(new T.BoxGeometry(6.05, 0.09, 0.78), brass, 1.4, y, 9.32);
  let bookIndex = 0;
  for (const shelfY of [-2.28, -1.55, -0.82]) for (let column = 0; column < 12; column += 1) {
    const height = 0.42 + ((column + bookIndex) % 4) * 0.055;
    const book = mesh(new RoundedBoxGeometry(0.24, height, 0.38, 2, 0.025), bookMaterials[bookIndex % bookMaterials.length], -1.15 + column * 0.46, shelfY + height / 2, 8.91);
    book.rotation.z = column % 5 === 0 ? 0.06 : 0; bookIndex += 1;
  }
  const chairSeat = mesh(new RoundedBoxGeometry(1.55, 0.38, 1.5, 5, 0.16), fabric, -5.25, -2.05, 7.25);
  chairSeat.rotation.y = -0.18;
  const chairBack = mesh(new RoundedBoxGeometry(1.65, 1.65, 0.38, 5, 0.16), fabric, -5.48, -1.15, 7.78);
  chairBack.rotation.set(-0.18, -0.18, 0);
  for (const x of [-5.82, -4.67]) for (const z of [6.82, 7.62]) mesh(new T.CylinderGeometry(0.055, 0.045, 0.75, 12), brass, x, -2.62, z);
  planter(5.25, 5.05, 0.8);
  const oppositeGlow = new T.PointLight('#ffe0b5', 0.75, 5, 2); oppositeGlow.position.set(2.5, 1.4, 7.6); group.add(oppositeGlow);

  return { group, dispose: () => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((meshMaterial) => meshMaterial.dispose());
    textures.forEach((roomTexture) => roomTexture.dispose());
  } };
}
