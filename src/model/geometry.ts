import type { Direction, Vec3 } from './types';

export function directionVector(dir: Direction): Vec3 {
  switch (dir) {
    case '+X': return [1, 0, 0];
    case '-X': return [-1, 0, 0];
    case '+Y': return [0, 1, 0];
    case '-Y': return [0, -1, 0];
    case '+Z': return [0, 0, 1];
    case '-Z': return [0, 0, -1];
  }
}

export function oppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case '+X': return '-X';
    case '-X': return '+X';
    case '+Y': return '-Y';
    case '-Y': return '+Y';
    case '+Z': return '-Z';
    case '-Z': return '+Z';
  }
}

export function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scaleVec(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

// Round to 0.5-unit lattice to avoid floating-point drift.
export function snapVec(v: Vec3): Vec3 {
  return [Math.round(v[0] * 2) / 2, Math.round(v[1] * 2) / 2, Math.round(v[2] * 2) / 2];
}

export function vecEquals(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
