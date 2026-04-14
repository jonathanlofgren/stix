import { describe, expect, it } from 'vitest';
import { parseDesign } from '../design';
import { IDENTITY_ROTATION } from '../rotation';

describe('parseDesign', () => {
  it('accepts a minimal valid design', () => {
    const raw = {
      pieces: [
        { id: 'c1', kind: 'connector', typeId: 'plus', position: [0, 0, 0], rotation: IDENTITY_ROTATION },
      ],
    };
    expect(() => parseDesign(raw)).not.toThrow();
  });

  it('rejects non-object input', () => {
    expect(() => parseDesign(null)).toThrow(/expected object/);
    expect(() => parseDesign('nope')).toThrow(/expected object/);
  });

  it('rejects a design with no pieces array', () => {
    expect(() => parseDesign({})).toThrow(/pieces/);
  });

  it('rejects unknown connector typeIds', () => {
    const raw = { pieces: [{ id: 'c1', kind: 'connector', typeId: 'nope', position: [0, 0, 0], rotation: 0 }] };
    expect(() => parseDesign(raw)).toThrow(/unknown connector/);
  });

  it('rejects rotation out of range', () => {
    const raw = { pieces: [{ id: 'c1', kind: 'connector', typeId: 'plus', position: [0, 0, 0], rotation: 99 }] };
    expect(() => parseDesign(raw)).toThrow(/rotation/);
  });

  it('rejects a pole referencing a missing anchor', () => {
    const raw = {
      pieces: [
        { id: 'p1', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'ghost', socket: '+X' } },
      ],
    };
    expect(() => parseDesign(raw)).toThrow(/from\.pieceId/);
  });

  it('rejects a pole anchor that is not a connector', () => {
    const raw = {
      pieces: [
        { id: 'p1', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'p2', socket: '+X' } },
        { id: 'p2', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'p1', socket: '+X' } },
      ],
    };
    expect(() => parseDesign(raw)).toThrow(/from\.pieceId/);
  });

  it('rejects a plate with inverted corners', () => {
    const raw = {
      pieces: [
        { id: 'pl', kind: 'plate', size: '1x1', color: 'blue', minCorner: [1, 1, 0], maxCorner: [0, 0, 0] },
      ],
    };
    expect(() => parseDesign(raw)).toThrow(/minCorner/);
  });

  it('rejects non-finite position components', () => {
    const raw = { pieces: [{ id: 'c1', kind: 'connector', typeId: 'plus', position: [0, NaN, 0], rotation: 0 }] };
    expect(() => parseDesign(raw)).toThrow(/position/);
  });
});
