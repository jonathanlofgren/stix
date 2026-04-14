import { describe, expect, it } from 'vitest';
import { enumerateCandidates, validatePlates } from '../plates';
import type { ConnectorPiece, Piece, PlatePiece, PolePiece } from '../types';
import { IDENTITY_ROTATION } from '../rotation';

function c(id: string, pos: [number, number, number]): ConnectorPiece {
  return { id, kind: 'connector', typeId: 'plus', position: pos, rotation: IDENTITY_ROTATION };
}

function p(id: string, from: string, fromSocket: '+X' | '+Y' | '+Z', to: string, toSocket: '-X' | '-Y' | '-Z', length: 0.5 | 1 = 1): PolePiece {
  return {
    id, kind: 'pole', length, color: 'yellow',
    from: { pieceId: from, socket: fromSocket },
    to: { pieceId: to, socket: toSocket },
  };
}

describe('enumerateCandidates', () => {
  it('finds exactly one 1x1 candidate on a fully-framed square', () => {
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [1, 0, 0]), c('d', [0, 1, 0]), c('e', [1, 1, 0]),
      p('e1', 'a', '+X', 'b', '-X'),
      p('e2', 'd', '+X', 'e', '-X'),
      p('e3', 'a', '+Y', 'd', '-Y'),
      p('e4', 'b', '+Y', 'e', '-Y'),
    ];
    const cands = enumerateCandidates(pieces, '1x1');
    expect(cands).toHaveLength(1);
    expect(cands[0].minCorner).toEqual([0, 0, 0]);
    expect(cands[0].maxCorner).toEqual([1, 1, 0]);
  });

  it('finds zero candidates if any edge pole is missing', () => {
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [1, 0, 0]), c('d', [0, 1, 0]), c('e', [1, 1, 0]),
      p('e1', 'a', '+X', 'b', '-X'),
      p('e2', 'd', '+X', 'e', '-X'),
      p('e3', 'a', '+Y', 'd', '-Y'),
      // missing e4 between b and e
    ];
    expect(enumerateCandidates(pieces, '1x1')).toHaveLength(0);
  });

  it('excludes candidates that already have a plate', () => {
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [1, 0, 0]), c('d', [0, 1, 0]), c('e', [1, 1, 0]),
      p('e1', 'a', '+X', 'b', '-X'),
      p('e2', 'd', '+X', 'e', '-X'),
      p('e3', 'a', '+Y', 'd', '-Y'),
      p('e4', 'b', '+Y', 'e', '-Y'),
      { id: 'pl', kind: 'plate', size: '1x1', color: 'blue', minCorner: [0, 0, 0], maxCorner: [1, 1, 0] } as PlatePiece,
    ];
    expect(enumerateCandidates(pieces, '1x1')).toHaveLength(0);
  });

  it('finds both orientations for 1x0.5 when both frames exist', () => {
    // Build a 1 × 0.5 frame in XY plane using half poles on the short edges.
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [1, 0, 0]), c('d', [0, 0.5, 0]), c('e', [1, 0.5, 0]),
      p('e1', 'a', '+X', 'b', '-X'),
      p('e2', 'd', '+X', 'e', '-X'),
      p('e3', 'a', '+Y', 'd', '-Y', 0.5),
      p('e4', 'b', '+Y', 'e', '-Y', 0.5),
    ];
    const cands = enumerateCandidates(pieces, '1x0.5');
    expect(cands.length).toBeGreaterThanOrEqual(1);
    expect(cands[0].minCorner).toEqual([0, 0, 0]);
    expect(cands[0].maxCorner).toEqual([1, 0.5, 0]);
  });
});

describe('validatePlates', () => {
  it('drops a plate whose frame has lost an edge pole', () => {
    const plate: PlatePiece = { id: 'pl', kind: 'plate', size: '1x1', color: 'blue', minCorner: [0, 0, 0], maxCorner: [1, 1, 0] };
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [1, 0, 0]), c('d', [0, 1, 0]), c('e', [1, 1, 0]),
      p('e1', 'a', '+X', 'b', '-X'),
      p('e2', 'd', '+X', 'e', '-X'),
      p('e3', 'a', '+Y', 'd', '-Y'),
      // missing e4 — plate should be dropped
      plate,
    ];
    const out = validatePlates(pieces);
    expect(out.find((x) => x.id === 'pl')).toBeUndefined();
  });

  it('keeps a plate whose frame is intact', () => {
    const plate: PlatePiece = { id: 'pl', kind: 'plate', size: '1x1', color: 'blue', minCorner: [0, 0, 0], maxCorner: [1, 1, 0] };
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [1, 0, 0]), c('d', [0, 1, 0]), c('e', [1, 1, 0]),
      p('e1', 'a', '+X', 'b', '-X'),
      p('e2', 'd', '+X', 'e', '-X'),
      p('e3', 'a', '+Y', 'd', '-Y'),
      p('e4', 'b', '+Y', 'e', '-Y'),
      plate,
    ];
    const out = validatePlates(pieces);
    expect(out.find((x) => x.id === 'pl')).toBeDefined();
  });
});
