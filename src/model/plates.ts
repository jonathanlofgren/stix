import type { ConnectorPiece, Piece, PlateSize, Vec3 } from './types';
import { plateEdgeLengths } from './types';
import { vecEquals } from './geometry';
import { posKey } from './design';

export type PlateCandidate = {
  minCorner: Vec3;
  maxCorner: Vec3;
  // The in-plane axes (the two axes along which the plate has extent).
  // The third axis is the plane normal.
  inPlaneAxes: [0 | 1 | 2, 0 | 1 | 2];
};

// Return true if there is exactly one pole of `length` whose endpoints are the two given connectors.
function edgeHasPole(pieces: Piece[], connectorA: string, connectorB: string, length: number): boolean {
  for (const p of pieces) {
    if (p.kind !== 'pole' || p.length !== length) continue;
    const aFrom = p.from.pieceId === connectorA && p.to?.pieceId === connectorB;
    const bFrom = p.from.pieceId === connectorB && p.to?.pieceId === connectorA;
    if (aFrom || bFrom) return true;
  }
  return false;
}

// Enumerate all rectangles in the design that can host a plate of the given size.
export function enumerateCandidates(pieces: Piece[], size: PlateSize): PlateCandidate[] {
  const [la, lb] = plateEdgeLengths(size);
  const connectors = pieces.filter((p): p is ConnectorPiece => p.kind === 'connector');
  const byPos = new Map<string, ConnectorPiece>();
  for (const c of connectors) byPos.set(posKey(c.position), c);

  const existingPlateKeys = new Set<string>();
  for (const p of pieces) {
    if (p.kind !== 'plate') continue;
    existingPlateKeys.add(`${posKey(p.minCorner)}|${posKey(p.maxCorner)}`);
  }

  const results: PlateCandidate[] = [];
  const axisPairs: Array<[0 | 1 | 2, 0 | 1 | 2]> = [[0, 1], [0, 2], [1, 2]];

  // For 1x0.5, try both edge-length orderings so either in-plane axis can be the short one.
  const edgeAssignments: Array<[number, number]> = la === lb ? [[la, lb]] : [[la, lb], [lb, la]];

  for (const c1 of connectors) {
    const p1 = c1.position;
    for (const [ax1, ax2] of axisPairs) {
      for (const [eA, eB] of edgeAssignments) {
        const p2: Vec3 = [...p1] as Vec3;
        p2[ax1] += eA;
        const p3: Vec3 = [...p1] as Vec3;
        p3[ax2] += eB;
        const p4: Vec3 = [...p1] as Vec3;
        p4[ax1] += eA;
        p4[ax2] += eB;

        const c2 = byPos.get(posKey(p2));
        const c3 = byPos.get(posKey(p3));
        const c4 = byPos.get(posKey(p4));
        if (!c2 || !c3 || !c4) continue;

        // Ensure c1 is lexicographic min of the four corners to dedupe (each rect found 4 times).
        const corners: Vec3[] = [p1, p2, p3, p4];
        const min = corners.reduce((a, b) =>
          a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] <= b[2]))) ? a : b,
        );
        if (!vecEquals(min, p1)) continue;

        if (!edgeHasPole(pieces, c1.id, c2.id, eA)) continue;
        if (!edgeHasPole(pieces, c3.id, c4.id, eA)) continue;
        if (!edgeHasPole(pieces, c1.id, c3.id, eB)) continue;
        if (!edgeHasPole(pieces, c2.id, c4.id, eB)) continue;

        const maxCorner = p4;
        const candidateKey = `${posKey(p1)}|${posKey(maxCorner)}`;
        if (existingPlateKeys.has(candidateKey)) continue;

        results.push({ minCorner: p1, maxCorner, inPlaneAxes: [ax1, ax2] });
      }
    }
  }

  return results;
}

// Drop plates that no longer have a fully-connected 4-pole rectangle.
export function validatePlates(pieces: Piece[]): Piece[] {
  const connectorIds = new Set(pieces.filter((p) => p.kind === 'connector').map((p) => p.id));
  const byPos = new Map<string, ConnectorPiece>();
  for (const p of pieces) {
    if (p.kind === 'connector') byPos.set(posKey(p.position), p);
  }
  return pieces.filter((p) => {
    if (p.kind !== 'plate') return true;
    const diff: Vec3 = [
      p.maxCorner[0] - p.minCorner[0],
      p.maxCorner[1] - p.minCorner[1],
      p.maxCorner[2] - p.minCorner[2],
    ];
    const axes: (0 | 1 | 2)[] = [];
    for (let i = 0; i < 3; i++) if (diff[i] !== 0) axes.push(i as 0 | 1 | 2);
    if (axes.length !== 2) return false;
    const [ax1, ax2] = axes;
    const p1 = p.minCorner;
    const p2: Vec3 = [...p1] as Vec3; p2[ax1] = p.maxCorner[ax1];
    const p3: Vec3 = [...p1] as Vec3; p3[ax2] = p.maxCorner[ax2];
    const p4 = p.maxCorner;
    const c1 = byPos.get(posKey(p1));
    const c2 = byPos.get(posKey(p2));
    const c3 = byPos.get(posKey(p3));
    const c4 = byPos.get(posKey(p4));
    if (!c1 || !c2 || !c3 || !c4) return false;
    if (!connectorIds.has(c1.id) || !connectorIds.has(c2.id) || !connectorIds.has(c3.id) || !connectorIds.has(c4.id)) return false;
    const eA = diff[ax1];
    const eB = diff[ax2];
    if (!edgeHasPole(pieces, c1.id, c2.id, eA)) return false;
    if (!edgeHasPole(pieces, c3.id, c4.id, eA)) return false;
    if (!edgeHasPole(pieces, c1.id, c3.id, eB)) return false;
    if (!edgeHasPole(pieces, c2.id, c4.id, eB)) return false;
    return true;
  });
}
