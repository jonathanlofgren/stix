import type { Piece, ConnectorType, Inventory, PoleLength, Color, PlateSize } from './types';
import { plateKey, poleKey } from './types';

export type PoleBomRow = {
  kind: 'pole';
  length: PoleLength;
  color: Color;
  count: number;
  owned: number | null;
  over: number;
};

export type PlateBomRow = {
  kind: 'plate';
  size: PlateSize;
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

export type BomRow = PoleBomRow | PlateBomRow | ConnectorBomRow;

const KIND_ORDER: Record<BomRow['kind'], number> = { pole: 0, plate: 1, connector: 2 };

export function computeBom(
  pieces: Piece[],
  connectorTypes: ConnectorType[],
  inventory: Inventory,
): BomRow[] {
  const connectorCounts = new Map<string, number>();
  const poleCounts = new Map<string, { length: PoleLength; color: Color; count: number }>();
  const plateCounts = new Map<string, { size: PlateSize; color: Color; count: number }>();

  for (const p of pieces) {
    if (p.kind === 'connector') {
      connectorCounts.set(p.typeId, (connectorCounts.get(p.typeId) ?? 0) + 1);
    } else if (p.kind === 'pole') {
      const key = poleKey(p.length, p.color);
      const existing = poleCounts.get(key);
      if (existing) existing.count += 1;
      else poleCounts.set(key, { length: p.length, color: p.color, count: 1 });
    } else {
      const key = plateKey(p.size, p.color);
      const existing = plateCounts.get(key);
      if (existing) existing.count += 1;
      else plateCounts.set(key, { size: p.size, color: p.color, count: 1 });
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

  for (const { size, color, count } of plateCounts.values()) {
    const owned = inventory.plates[plateKey(size, color)] ?? null;
    const over = owned == null ? 0 : Math.max(0, count - owned);
    rows.push({ kind: 'plate', size, color, count, owned, over });
  }

  const PLATE_SIZE_ORDER: Record<PlateSize, number> = { '1x1': 0, '1x0.5': 1 };

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (a.kind === 'pole' && b.kind === 'pole') {
      if (a.length !== b.length) return b.length - a.length;
      return a.color.localeCompare(b.color);
    }
    if (a.kind === 'plate' && b.kind === 'plate') {
      if (a.size !== b.size) return PLATE_SIZE_ORDER[a.size] - PLATE_SIZE_ORDER[b.size];
      return a.color.localeCompare(b.color);
    }
    if (a.kind === 'connector' && b.kind === 'connector') {
      return a.label.localeCompare(b.label);
    }
    return 0;
  });

  return rows;
}
