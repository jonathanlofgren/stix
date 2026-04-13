import type { Piece, ConnectorType, Inventory, PoleLength, Color } from './types';
import { poleKey } from './types';

export type PoleBomRow = {
  kind: 'pole';
  length: PoleLength;
  color: Color;
  count: number;
  owned: number | null;
  over: number;
};

export type ConnectorBomRow = {
  kind: 'connector';
  typeId: string;
  label: string;
  count: number;
  owned: number | null;
  over: number;
};

export type BomRow = PoleBomRow | ConnectorBomRow;

export function computeBom(
  pieces: Piece[],
  connectorTypes: ConnectorType[],
  inventory: Inventory,
): BomRow[] {
  const connectorCounts = new Map<string, number>();
  const poleCounts = new Map<string, { length: PoleLength; color: Color; count: number }>();

  for (const p of pieces) {
    if (p.kind === 'connector') {
      connectorCounts.set(p.typeId, (connectorCounts.get(p.typeId) ?? 0) + 1);
    } else {
      const key = poleKey(p.length, p.color);
      const existing = poleCounts.get(key);
      if (existing) existing.count += 1;
      else poleCounts.set(key, { length: p.length, color: p.color, count: 1 });
    }
  }

  const typeById = new Map(connectorTypes.map((t) => [t.id, t]));

  const rows: BomRow[] = [];

  for (const [typeId, count] of connectorCounts) {
    const owned = inventory.connectors[typeId] ?? null;
    const over = owned == null ? 0 : Math.max(0, count - owned);
    rows.push({
      kind: 'connector',
      typeId,
      label: typeById.get(typeId)?.label ?? typeId,
      count,
      owned,
      over,
    });
  }

  for (const { length, color, count } of poleCounts.values()) {
    const owned = inventory.poles[poleKey(length, color)] ?? null;
    const over = owned == null ? 0 : Math.max(0, count - owned);
    rows.push({ kind: 'pole', length, color, count, owned, over });
  }

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'pole' ? -1 : 1;
    if (a.kind === 'pole' && b.kind === 'pole') {
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      return a.length - b.length;
    }
    if (a.kind === 'connector' && b.kind === 'connector') {
      return a.label.localeCompare(b.label);
    }
    return 0;
  });

  return rows;
}
