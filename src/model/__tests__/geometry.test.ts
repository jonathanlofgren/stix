import { describe, expect, it } from 'vitest';
import {
  addVec, directionVector, oppositeDirection, scaleVec, snapVec, vecEquals,
} from '../geometry';
import { ALL_DIRECTIONS } from '../types';

describe('geometry', () => {
  it('addVec / scaleVec', () => {
    expect(addVec([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
    expect(scaleVec([1, 2, 3], 0.5)).toEqual([0.5, 1, 1.5]);
  });

  it('snapVec rounds to 0.5 lattice', () => {
    expect(snapVec([0.24, 0.26, -0.74])).toEqual([0, 0.5, -0.5]);
    const snapped = snapVec([1.0000001, -0.00001, 2.249]);
    expect(snapped[0]).toBe(1);
    expect(snapped[1] === 0).toBe(true); // accepts +0 or -0
    expect(snapped[2]).toBe(2);
  });

  it('vecEquals', () => {
    expect(vecEquals([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(vecEquals([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it('oppositeDirection is an involution across all directions', () => {
    for (const d of ALL_DIRECTIONS) {
      expect(oppositeDirection(oppositeDirection(d))).toBe(d);
    }
  });

  it('directionVector returns unit basis vectors', () => {
    expect(directionVector('+X')).toEqual([1, 0, 0]);
    expect(directionVector('-Y')).toEqual([0, -1, 0]);
    expect(directionVector('+Z')).toEqual([0, 0, 1]);
  });
});
