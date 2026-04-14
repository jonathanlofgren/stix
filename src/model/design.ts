import type {
  Color, ConnectorPiece, Design, Direction, Piece, PlatePiece, PlateSize,
  PolePiece, PoleLength, Vec3,
} from './types';
import { ALL_COLORS, ALL_DIRECTIONS, ALL_LENGTHS, ALL_PLATE_SIZES } from './types';
import { NUM_ROTATIONS } from './rotation';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';

export function posKey(v: Vec3): string {
  return `${v[0]},${v[1]},${v[2]}`;
}

class ParseError extends Error {}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function parseVec3(v: unknown, field: string): Vec3 {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isFiniteNumber)) {
    throw new ParseError(`${field}: expected [x, y, z] of finite numbers`);
  }
  return [v[0], v[1], v[2]];
}

function parseDirection(v: unknown, field: string): Direction {
  if (typeof v !== 'string' || !(ALL_DIRECTIONS as readonly string[]).includes(v)) {
    throw new ParseError(`${field}: expected one of ${ALL_DIRECTIONS.join(', ')}`);
  }
  return v as Direction;
}

function parseColor(v: unknown, field: string): Color {
  if (typeof v !== 'string' || !(ALL_COLORS as readonly string[]).includes(v)) {
    throw new ParseError(`${field}: expected one of ${ALL_COLORS.join(', ')}`);
  }
  return v as Color;
}

function parsePoleLength(v: unknown, field: string): PoleLength {
  if (!(ALL_LENGTHS as readonly number[]).includes(v as number)) {
    throw new ParseError(`${field}: expected one of ${ALL_LENGTHS.join(', ')}`);
  }
  return v as PoleLength;
}

function parsePlateSize(v: unknown, field: string): PlateSize {
  if (typeof v !== 'string' || !(ALL_PLATE_SIZES as readonly string[]).includes(v)) {
    throw new ParseError(`${field}: expected one of ${ALL_PLATE_SIZES.join(', ')}`);
  }
  return v as PlateSize;
}

function parsePiece(raw: unknown, idx: number): Piece {
  if (!raw || typeof raw !== 'object') {
    throw new ParseError(`pieces[${idx}]: expected object`);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || r.id.length === 0) {
    throw new ParseError(`pieces[${idx}].id: expected non-empty string`);
  }

  if (r.kind === 'connector') {
    const typeId = r.typeId;
    if (typeof typeId !== 'string' || !DEFAULT_CONNECTORS.some((t) => t.id === typeId)) {
      throw new ParseError(`pieces[${idx}].typeId: unknown connector "${String(typeId)}"`);
    }
    const rotation = r.rotation;
    if (!Number.isInteger(rotation) || (rotation as number) < 0 || (rotation as number) >= NUM_ROTATIONS) {
      throw new ParseError(`pieces[${idx}].rotation: expected integer in [0, ${NUM_ROTATIONS})`);
    }
    const piece: ConnectorPiece = {
      id: r.id,
      kind: 'connector',
      typeId,
      position: parseVec3(r.position, `pieces[${idx}].position`),
      rotation: rotation as number,
    };
    return piece;
  }

  if (r.kind === 'pole') {
    const length = parsePoleLength(r.length, `pieces[${idx}].length`);
    const color = parseColor(r.color, `pieces[${idx}].color`);
    const from = r.from as Record<string, unknown> | undefined;
    if (!from || typeof from !== 'object') {
      throw new ParseError(`pieces[${idx}].from: expected object`);
    }
    if (typeof from.pieceId !== 'string') {
      throw new ParseError(`pieces[${idx}].from.pieceId: expected string`);
    }
    const fromSocket = parseDirection(from.socket, `pieces[${idx}].from.socket`);
    const piece: PolePiece = {
      id: r.id,
      kind: 'pole',
      length,
      color,
      from: { pieceId: from.pieceId, socket: fromSocket },
    };
    if (r.to != null) {
      const to = r.to as Record<string, unknown>;
      if (typeof to !== 'object' || typeof to.pieceId !== 'string') {
        throw new ParseError(`pieces[${idx}].to: expected { pieceId, socket }`);
      }
      piece.to = {
        pieceId: to.pieceId,
        socket: parseDirection(to.socket, `pieces[${idx}].to.socket`),
      };
    }
    return piece;
  }

  if (r.kind === 'plate') {
    const size = parsePlateSize(r.size, `pieces[${idx}].size`);
    const color = parseColor(r.color, `pieces[${idx}].color`);
    const minCorner = parseVec3(r.minCorner, `pieces[${idx}].minCorner`);
    const maxCorner = parseVec3(r.maxCorner, `pieces[${idx}].maxCorner`);
    for (let i = 0; i < 3; i++) {
      if (minCorner[i] > maxCorner[i]) {
        throw new ParseError(`pieces[${idx}]: minCorner must be <= maxCorner componentwise`);
      }
    }
    const piece: PlatePiece = {
      id: r.id,
      kind: 'plate',
      size,
      color,
      minCorner,
      maxCorner,
    };
    return piece;
  }

  throw new ParseError(`pieces[${idx}].kind: unknown "${String(r.kind)}"`);
}

export function parseDesign(raw: unknown): Design {
  if (!raw || typeof raw !== 'object') {
    throw new ParseError('design: expected object');
  }
  const { pieces } = raw as { pieces?: unknown };
  if (!Array.isArray(pieces)) {
    throw new ParseError('design.pieces: expected array');
  }
  const parsed: Piece[] = pieces.map((p, i) => parsePiece(p, i));

  // Referential integrity: every pole's `from`/`to` must reference an existing connector piece.
  const byId = new Map(parsed.map((p) => [p.id, p]));
  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    if (p.kind !== 'pole') continue;
    const anchor = byId.get(p.from.pieceId);
    if (!anchor || anchor.kind !== 'connector') {
      throw new ParseError(`pieces[${i}].from.pieceId: references non-connector or missing "${p.from.pieceId}"`);
    }
    if (p.to) {
      const target = byId.get(p.to.pieceId);
      if (!target || target.kind !== 'connector') {
        throw new ParseError(`pieces[${i}].to.pieceId: references non-connector or missing "${p.to.pieceId}"`);
      }
    }
  }

  return { pieces: parsed };
}
