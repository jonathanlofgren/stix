import type { ConnectorPiece, Piece } from './types';
import { directionVector } from './geometry';

// Snap a height to the 0.5-unit lattice so floating-point drift can't split a layer.
const yKey = (y: number): number => Math.round(y * 2) / 2;

export type BuildLayer = {
  // Height (Y) of the connectors that define this layer.
  y: number;
  // Ids of every piece introduced when this layer is assembled.
  pieceIds: string[];
};

// The top-most Y reached by a piece. A piece is assembled in the layer at this
// height: a connector at its own height, a horizontal pole/plate at its (single)
// height, and a vertical pole/plate at the height of its upper end — because you
// raise it into place only once the layer below is standing.
export function pieceTopY(piece: Piece, connById: Map<string, ConnectorPiece>): number {
  if (piece.kind === 'connector') return piece.position[1];
  if (piece.kind === 'plate') return Math.max(piece.minCorner[1], piece.maxCorner[1]);
  // pole: anchored at a connector, extends one length along its socket direction.
  const anchor = connById.get(piece.from.pieceId);
  if (!anchor) return 0;
  const fromY = anchor.position[1];
  const endY = fromY + directionVector(piece.from.socket)[1] * piece.length;
  return Math.max(fromY, endY);
}

// Group a design into bottom-up build layers. Layer levels are the distinct
// connector heights; every piece is assigned to the layer at its top-most height.
// Because all poles are axis-aligned, each piece sits within one layer (horizontal
// poles/plates) or bridges into the layer above (vertical poles/plates) — never
// ambiguously across more than one level.
export function computeLayers(pieces: Piece[]): BuildLayer[] {
  const connById = new Map<string, ConnectorPiece>();
  for (const p of pieces) if (p.kind === 'connector') connById.set(p.id, p);

  const levels = Array.from(
    new Set([...connById.values()].map((c) => yKey(c.position[1]))),
  ).sort((a, b) => a - b);

  if (levels.length === 0) return [];

  const layers: BuildLayer[] = levels.map((y) => ({ y, pieceIds: [] }));

  // Index of the highest layer level at or below `top`.
  const levelIndexFor = (top: number): number => {
    let idx = 0;
    for (let i = 0; i < levels.length; i++) {
      if (levels[i] <= top + 1e-9) idx = i;
    }
    return idx;
  };

  for (const p of pieces) {
    const idx = levelIndexFor(pieceTopY(p, connById));
    layers[idx].pieceIds.push(p.id);
  }

  return layers;
}
