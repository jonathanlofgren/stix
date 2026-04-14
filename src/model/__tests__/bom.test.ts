import { describe, expect, it } from 'vitest';
import { computeBom } from '../bom';
import type { Inventory, Piece } from '../types';
import { IDENTITY_ROTATION } from '../rotation';
import { DEFAULT_CONNECTORS } from '../../catalog/defaultConnectors';

const emptyInventory: Inventory = { connectors: {}, poles: {}, plates: {} };

describe('computeBom', () => {
  it('counts connectors, poles, and plates', () => {
    const pieces: Piece[] = [
      { id: 'c1', kind: 'connector', typeId: 'plus', position: [0, 0, 0], rotation: IDENTITY_ROTATION },
      { id: 'c2', kind: 'connector', typeId: 'plus', position: [1, 0, 0], rotation: IDENTITY_ROTATION },
      { id: 'p1', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'c1', socket: '+X' } },
      { id: 'pl1', kind: 'plate', size: '1x1', color: 'yellow', minCorner: [0, 0, 0], maxCorner: [1, 1, 0] },
    ];
    const rows = computeBom(pieces, DEFAULT_CONNECTORS, emptyInventory);
    const plus = rows.find((r) => r.kind === 'connector' && r.typeId === 'plus');
    expect(plus?.count).toBe(2);
    expect(rows.find((r) => r.kind === 'pole')?.count).toBe(1);
    expect(rows.find((r) => r.kind === 'plate')?.count).toBe(1);
  });

  it('flags over-inventory via `over`', () => {
    const pieces: Piece[] = [
      { id: 'p1', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'x', socket: '+X' } },
      { id: 'p2', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'x', socket: '+X' } },
      { id: 'p3', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'x', socket: '+X' } },
    ];
    const inventory: Inventory = { connectors: {}, poles: { '1-blue': 2 }, plates: {} };
    const rows = computeBom(pieces, DEFAULT_CONNECTORS, inventory);
    const pole = rows.find((r) => r.kind === 'pole')!;
    expect(pole.count).toBe(3);
    expect(pole.owned).toBe(2);
    expect(pole.over).toBe(1);
  });

  it('treats missing inventory entries as unlimited (over = 0)', () => {
    const pieces: Piece[] = [
      { id: 'p1', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'x', socket: '+X' } },
    ];
    const rows = computeBom(pieces, DEFAULT_CONNECTORS, emptyInventory);
    const pole = rows.find((r) => r.kind === 'pole')!;
    expect(pole.owned).toBeNull();
    expect(pole.over).toBe(0);
  });

  it('orders rows: poles, plates, connectors', () => {
    const pieces: Piece[] = [
      { id: 'c1', kind: 'connector', typeId: 'plus', position: [0, 0, 0], rotation: IDENTITY_ROTATION },
      { id: 'p1', kind: 'pole', length: 1, color: 'blue', from: { pieceId: 'c1', socket: '+X' } },
      { id: 'pl1', kind: 'plate', size: '1x1', color: 'yellow', minCorner: [0, 0, 0], maxCorner: [1, 1, 0] },
    ];
    const rows = computeBom(pieces, DEFAULT_CONNECTORS, emptyInventory);
    expect(rows.map((r) => r.kind)).toEqual(['pole', 'plate', 'connector']);
  });
});
