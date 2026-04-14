import { describe, expect, it } from 'vitest';
import {
  IDENTITY_ROTATION, NUM_ROTATIONS, rotateDirection, rotateSockets,
} from '../rotation';
import { ALL_DIRECTIONS } from '../types';
import type { Direction } from '../types';

describe('rotation', () => {
  it('generates the 24-element cubic rotation group', () => {
    expect(NUM_ROTATIONS).toBe(24);
  });

  it('rotation 0 is the identity', () => {
    expect(IDENTITY_ROTATION).toBe(0);
    for (const d of ALL_DIRECTIONS) {
      expect(rotateDirection(IDENTITY_ROTATION, d)).toBe(d);
    }
  });

  it('every rotation maps every direction to a valid Direction', () => {
    for (let r = 0; r < NUM_ROTATIONS; r++) {
      for (const d of ALL_DIRECTIONS) {
        const out = rotateDirection(r, d);
        expect(ALL_DIRECTIONS).toContain(out);
      }
    }
  });

  it('every rotation permutes the 6 directions (bijective)', () => {
    for (let r = 0; r < NUM_ROTATIONS; r++) {
      const out = new Set(ALL_DIRECTIONS.map((d) => rotateDirection(r, d)));
      expect(out.size).toBe(6);
    }
  });

  // Pin the BFS-generated order so saved designs don't break across refactors.
  // If this test fails, a saved file migration is required.
  it('pins rotation IDs 0..3 against the current BFS order', () => {
    const basis: Direction[] = ['+X', '+Y', '+Z'];
    const snapshots: Direction[][] = [];
    for (let r = 0; r < 4; r++) snapshots.push(rotateSockets(basis, r));
    expect(snapshots).toEqual([
      ['+X', '+Y', '+Z'],
      ['+X', '+Z', '-Y'],
      ['-Z', '+Y', '+X'],
      ['+Y', '-X', '+Z'],
    ]);
  });
});
