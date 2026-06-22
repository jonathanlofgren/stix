import { describe, expect, it } from 'vitest';
import { computeLayers } from '../buildPlan';
import type { ConnectorPiece, Piece, PlatePiece, PolePiece } from '../types';
import { IDENTITY_ROTATION } from '../rotation';

function c(id: string, pos: [number, number, number]): ConnectorPiece {
  return { id, kind: 'connector', typeId: 'plus', position: pos, rotation: IDENTITY_ROTATION };
}

function pole(
  id: string,
  from: string,
  socket: PolePiece['from']['socket'],
  to: string,
  length: 0.5 | 1 = 1,
): PolePiece {
  return {
    id, kind: 'pole', length, color: 'blue',
    from: { pieceId: from, socket },
    to: { pieceId: to, socket: socket },
  };
}

describe('computeLayers', () => {
  it('returns no layers for an empty design', () => {
    expect(computeLayers([])).toEqual([]);
  });

  it('places a flat horizontal frame in a single layer', () => {
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [1, 0, 0]),
      pole('e1', 'a', '+X', 'b'),
    ];
    const layers = computeLayers(pieces);
    expect(layers).toHaveLength(1);
    expect(layers[0].y).toBe(0);
    expect(layers[0].pieceIds.sort()).toEqual(['a', 'b', 'e1']);
  });

  it('assigns a vertical pole to the upper layer it rises into', () => {
    const pieces: Piece[] = [
      c('base', [0, 0, 0]),
      c('top', [0, 1, 0]),
      pole('up', 'base', '+Y', 'top'),
    ];
    const layers = computeLayers(pieces);
    expect(layers.map((l) => l.y)).toEqual([0, 1]);
    expect(layers[0].pieceIds).toEqual(['base']);
    // The vertical pole is raised into place with the upper layer, not the base.
    expect(layers[1].pieceIds.sort()).toEqual(['top', 'up']);
  });

  it('separates two stacked floors with their own horizontal members', () => {
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [1, 0, 0]),
      c('c', [0, 1, 0]), c('d', [1, 1, 0]),
      pole('floor0', 'a', '+X', 'b'),
      pole('floor1', 'c', '+X', 'd'),
      pole('postA', 'a', '+Y', 'c'),
      pole('postB', 'b', '+Y', 'd'),
    ];
    const layers = computeLayers(pieces);
    expect(layers.map((l) => l.y)).toEqual([0, 1]);
    expect(layers[0].pieceIds.sort()).toEqual(['a', 'b', 'floor0']);
    expect(layers[1].pieceIds.sort()).toEqual(['c', 'd', 'floor1', 'postA', 'postB']);
  });

  it('handles half-unit layer heights', () => {
    const pieces: Piece[] = [
      c('a', [0, 0, 0]),
      c('b', [0, 0.5, 0]),
      pole('up', 'a', '+Y', 'b', 0.5),
    ];
    const layers = computeLayers(pieces);
    expect(layers.map((l) => l.y)).toEqual([0, 0.5]);
    expect(layers[1].pieceIds.sort()).toEqual(['b', 'up']);
  });

  it('assigns a horizontal plate to its own layer and a vertical plate to its top edge', () => {
    const horizontal: PlatePiece = {
      id: 'flat', kind: 'plate', size: '1x1', color: 'blue',
      minCorner: [0, 1, 0], maxCorner: [1, 1, 1],
    };
    const vertical: PlatePiece = {
      id: 'wall', kind: 'plate', size: '1x1', color: 'yellow',
      minCorner: [0, 0, 0], maxCorner: [1, 1, 0],
    };
    const pieces: Piece[] = [
      c('a', [0, 0, 0]), c('b', [0, 1, 0]),
      horizontal, vertical,
    ];
    const layers = computeLayers(pieces);
    expect(layers.map((l) => l.y)).toEqual([0, 1]);
    // Both plates reach height 1, so both are assembled with the top layer.
    expect(layers[1].pieceIds.sort()).toEqual(['b', 'flat', 'wall']);
  });
});
