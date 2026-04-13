import type { Direction } from './types';
import { ALL_DIRECTIONS } from './types';

type Mat3 = [[number, number, number], [number, number, number], [number, number, number]];

const ROT_X_90: Mat3 = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
const ROT_Y_90: Mat3 = [[0, 0, 1], [0, 1, 0], [-1, 0, 0]];
const ROT_Z_90: Mat3 = [[0, -1, 0], [1, 0, 0], [0, 0, 1]];

function mul(a: Mat3, b: Mat3): Mat3 {
  const r: Mat3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) r[i][j] += a[i][k] * b[k][j];
  return r;
}

function matEq(a: Mat3, b: Mat3): boolean {
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) if (a[i][j] !== b[i][j]) return false;
  return true;
}

function generateCubicRotations(): Mat3[] {
  const I: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const result: Mat3[] = [];
  const queue: Mat3[] = [I];
  while (queue.length) {
    const m = queue.shift()!;
    if (result.some((r) => matEq(r, m))) continue;
    result.push(m);
    queue.push(mul(m, ROT_X_90));
    queue.push(mul(m, ROT_Y_90));
    queue.push(mul(m, ROT_Z_90));
  }
  return result;
}

const DIR_VECS: Record<Direction, [number, number, number]> = {
  '+X': [1, 0, 0], '-X': [-1, 0, 0],
  '+Y': [0, 1, 0], '-Y': [0, -1, 0],
  '+Z': [0, 0, 1], '-Z': [0, 0, -1],
};

function vecToDir(v: [number, number, number]): Direction {
  for (const d of ALL_DIRECTIONS) {
    const dv = DIR_VECS[d];
    if (dv[0] === v[0] && dv[1] === v[1] && dv[2] === v[2]) return d;
  }
  throw new Error(`bad vec ${v}`);
}

function applyMat(m: Mat3, v: [number, number, number]): [number, number, number] {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

const ALL_ROTATIONS_MAT = generateCubicRotations();

// RotationId: index into ALL_ROTATIONS_MAT (0..23). Stored on pieces; stable across save/load.
export type RotationId = number;
export const IDENTITY_ROTATION: RotationId = 0;

export function rotateDirection(rot: RotationId, d: Direction): Direction {
  return vecToDir(applyMat(ALL_ROTATIONS_MAT[rot], DIR_VECS[d]));
}

export function rotateSockets(sockets: Direction[], rot: RotationId): Direction[] {
  return sockets.map((s) => rotateDirection(rot, s));
}

export function rotationToEuler(rot: RotationId): [number, number, number] {
  const m = ALL_ROTATIONS_MAT[rot];
  const sy = Math.sqrt(m[0][0] * m[0][0] + m[1][0] * m[1][0]);
  const singular = sy < 1e-6;
  let x: number, y: number, z: number;
  if (!singular) {
    x = Math.atan2(m[2][1], m[2][2]);
    y = Math.atan2(-m[2][0], sy);
    z = Math.atan2(m[1][0], m[0][0]);
  } else {
    x = Math.atan2(-m[1][2], m[1][1]);
    y = Math.atan2(-m[2][0], sy);
    z = 0;
  }
  return [x, y, z];
}

// Find a rotation such that `requiredSocket` is among the rotated sockets.
export function findRotationWithSocket(
  baseSockets: Direction[],
  requiredSocket: Direction,
): RotationId | null {
  for (let i = 0; i < ALL_ROTATIONS_MAT.length; i++) {
    const rotated = rotateSockets(baseSockets, i);
    if (rotated.includes(requiredSocket)) return i;
  }
  return null;
}

export const NUM_ROTATIONS = ALL_ROTATIONS_MAT.length;
