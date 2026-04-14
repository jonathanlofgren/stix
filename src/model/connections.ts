import type {
  ConnectorPiece, ConnectorType, Direction, Piece, Vec3,
} from './types';
import {
  addVec, directionVector, oppositeDirection, scaleVec, snapVec,
} from './geometry';
import { NUM_ROTATIONS, rotateSockets } from './rotation';
import { posKey } from './design';

// An open socket is either a connector-socket or a pole-free-end.
export type OpenSocket =
  | { kind: 'connector-socket'; pieceId: string; socket: Direction; worldPos: Vec3 }
  | { kind: 'pole-end'; poleId: string; direction: Direction; worldPos: Vec3 };

// After any placement, connect open pole-ends that coincide with an open socket on a connector.
export function resolveConnections(pieces: Piece[], connectorTypes: ConnectorType[]): Piece[] {
  const typeById = new Map(connectorTypes.map((t) => [t.id, t]));

  let current = pieces;
  let changed = true;
  while (changed) {
    changed = false;
    const byId = new Map<string, Piece>();
    for (const p of current) byId.set(p.id, p);
    const byPos = new Map<string, ConnectorPiece>();
    for (const p of current) if (p.kind === 'connector') byPos.set(posKey(p.position), p);
    const used = new Set<string>();
    for (const p of current) {
      if (p.kind !== 'pole') continue;
      used.add(`${p.from.pieceId}:${p.from.socket}`);
      if (p.to) used.add(`${p.to.pieceId}:${p.to.socket}`);
    }

    for (const p of current) {
      if (p.kind !== 'pole' || p.to) continue;
      const anchor = byId.get(p.from.pieceId);
      if (!anchor || anchor.kind !== 'connector') continue;
      const dir = p.from.socket;
      const endPos: Vec3 = snapVec(addVec(anchor.position, scaleVec(directionVector(dir), p.length)));

      const target = byPos.get(posKey(endPos));
      if (!target || target.id === anchor.id) continue;

      const type = typeById.get(target.typeId);
      if (!type) continue;
      const effective = rotateSockets(type.sockets, target.rotation);
      const needed = oppositeDirection(dir);
      if (!effective.includes(needed)) continue;
      if (used.has(`${target.id}:${needed}`)) continue;

      current = current.map((x) =>
        x.id === p.id && x.kind === 'pole'
          ? { ...x, to: { pieceId: target.id, socket: needed } }
          : x,
      );
      changed = true;
      break; // restart with fresh indices
    }
  }
  return current;
}

// Find the rotation of `baseSockets` that covers the maximum number of `required` directions,
// while at minimum always covering `mustInclude`. Returns null if mustInclude can never be covered.
export function findBestRotation(
  baseSockets: Direction[],
  required: Set<Direction>,
  mustInclude: Direction,
): number | null {
  let best: { rot: number; score: number } | null = null;
  for (let i = 0; i < NUM_ROTATIONS; i++) {
    const rotated = new Set(rotateSockets(baseSockets, i));
    if (!rotated.has(mustInclude)) continue;
    let score = 0;
    for (const d of required) if (rotated.has(d)) score += 1;
    if (!best || score > best.score) best = { rot: i, score };
  }
  return best?.rot ?? null;
}

export function effectiveSockets(piece: ConnectorPiece, connectorTypes: ConnectorType[]): Direction[] {
  const type = connectorTypes.find((t) => t.id === piece.typeId);
  if (!type) return [];
  return rotateSockets(type.sockets, piece.rotation);
}

export function computeOpenSockets(pieces: Piece[], connectorTypes: ConnectorType[]): OpenSocket[] {
  const byId = new Map<string, Piece>();
  for (const p of pieces) byId.set(p.id, p);

  const used = new Set<string>();
  for (const p of pieces) {
    if (p.kind !== 'pole') continue;
    used.add(`${p.from.pieceId}:${p.from.socket}`);
    if (p.to) used.add(`${p.to.pieceId}:${p.to.socket}`);
  }

  const results: OpenSocket[] = [];

  for (const p of pieces) {
    if (p.kind !== 'connector') continue;
    const sockets = effectiveSockets(p, connectorTypes);
    for (const s of sockets) {
      if (used.has(`${p.id}:${s}`)) continue;
      // Socket offset from connector center: tiny nub just outside the connector body.
      const offset = scaleVec(directionVector(s), 0.25);
      results.push({
        kind: 'connector-socket',
        pieceId: p.id,
        socket: s,
        worldPos: addVec(p.position, offset),
      });
    }
  }

  for (const p of pieces) {
    if (p.kind !== 'pole') continue;
    if (p.to) continue;
    const anchor = byId.get(p.from.pieceId);
    if (!anchor || anchor.kind !== 'connector') continue;
    const dir = p.from.socket;
    const endPos = snapVec(addVec(anchor.position, scaleVec(directionVector(dir), p.length)));
    results.push({ kind: 'pole-end', poleId: p.id, direction: dir, worldPos: endPos });
  }

  return results;
}

export function connectorWorldPosition(pieces: Piece[], id: string): Vec3 | null {
  const piece = pieces.find((p) => p.id === id);
  if (!piece) return null;
  if (piece.kind === 'connector') return piece.position;
  if (piece.kind !== 'pole') return null;
  const anchor = pieces.find((p) => p.id === piece.from.pieceId);
  if (!anchor || anchor.kind !== 'connector') return null;
  return anchor.position;
}

