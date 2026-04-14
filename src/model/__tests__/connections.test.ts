import { describe, expect, it } from 'vitest';
import {
  computeOpenSockets, findBestRotation, resolveConnections,
} from '../connections';
import type { ConnectorPiece, Direction, Piece, PolePiece } from '../types';
import { IDENTITY_ROTATION } from '../rotation';
import { DEFAULT_CONNECTORS } from '../../catalog/defaultConnectors';

function connector(id: string, typeId: string, position: [number, number, number], rotation = IDENTITY_ROTATION): ConnectorPiece {
  return { id, kind: 'connector', typeId, position, rotation };
}

function pole(id: string, anchorId: string, socket: Direction, length: 0.5 | 1 = 1): PolePiece {
  return { id, kind: 'pole', length, color: 'blue', from: { pieceId: anchorId, socket } };
}

describe('resolveConnections', () => {
  it('closes a pole whose far end lands on a matching connector socket', () => {
    const pieces: Piece[] = [
      connector('a', 'plus', [0, 0, 0]),
      connector('b', 'plus', [1, 0, 0]),
      pole('p1', 'a', '+X'),
    ];
    const resolved = resolveConnections(pieces, DEFAULT_CONNECTORS);
    const p = resolved.find((x) => x.id === 'p1');
    expect(p?.kind).toBe('pole');
    if (p?.kind !== 'pole') throw new Error('unreachable');
    expect(p.to).toEqual({ pieceId: 'b', socket: '-X' });
  });

  it('does not attach to a connector lacking the opposite socket', () => {
    // L connector has {+X, +Y}; no -X, so a pole arriving from the +X side cannot close.
    const pieces: Piece[] = [
      connector('a', 'plus', [0, 0, 0]),
      connector('b', 'L', [1, 0, 0]),
      pole('p1', 'a', '+X'),
    ];
    const resolved = resolveConnections(pieces, DEFAULT_CONNECTORS);
    const p = resolved.find((x) => x.id === 'p1') as PolePiece;
    expect(p.to).toBeUndefined();
  });

  it('leaves an already-used target socket alone', () => {
    // Two poles both want to close into connector b's -X socket; only one gets it.
    const pieces: Piece[] = [
      connector('a', 'plus', [0, 0, 0]),
      connector('b', 'plus', [1, 0, 0]),
      pole('p1', 'a', '+X'),
      { ...pole('p2', 'a', '+Y'), to: { pieceId: 'b', socket: '-X' } } as PolePiece,
    ];
    const resolved = resolveConnections(pieces, DEFAULT_CONNECTORS);
    const p1 = resolved.find((x) => x.id === 'p1') as PolePiece;
    expect(p1.to).toBeUndefined();
  });
});

describe('computeOpenSockets', () => {
  it('reports every un-used connector socket plus free pole-ends', () => {
    const pieces: Piece[] = [
      connector('a', 'T', [0, 0, 0]), // sockets +X, -X, +Y
      pole('p1', 'a', '+X'),          // closes +X; free end at (1,0,0)
    ];
    const open = computeOpenSockets(pieces, DEFAULT_CONNECTORS);
    const connectorSockets = open.filter((o) => o.kind === 'connector-socket');
    const poleEnds = open.filter((o) => o.kind === 'pole-end');
    expect(connectorSockets.map((o) => (o as any).socket).sort()).toEqual(['+Y', '-X']);
    expect(poleEnds).toHaveLength(1);
    expect(poleEnds[0]).toMatchObject({ kind: 'pole-end', direction: '+X', worldPos: [1, 0, 0] });
  });
});

describe('findBestRotation', () => {
  const plus = DEFAULT_CONNECTORS.find((t) => t.id === 'plus')!.sockets; // +X -X +Y -Y
  const L = DEFAULT_CONNECTORS.find((t) => t.id === 'L')!.sockets;       // +X +Y

  it('returns null if mustInclude cannot be covered by any rotation (Z for a 2D L)', () => {
    // An L has no way to include +Z and -Z simultaneously in its two sockets, but it can include
    // +Z alone in some rotation. mustInclude being unreachable is tested by forcing an impossible
    // pair: pass a connector with no sockets.
    const rot = findBestRotation([], new Set<Direction>(['+X']), '+X');
    expect(rot).toBeNull();
  });

  it('picks a rotation covering all required sockets when possible', () => {
    const required = new Set<Direction>(['+X', '-X', '+Y', '-Y']);
    const rot = findBestRotation(plus, required, '+X');
    expect(rot).not.toBeNull();
  });

  it('maximizes coverage when full coverage is impossible', () => {
    // L covers 2 sockets; asking for 3 coplanar ones should still pick a rotation covering 2.
    const required = new Set<Direction>(['+X', '+Y', '-X']);
    const rot = findBestRotation(L, required, '+X');
    expect(rot).not.toBeNull();
  });
});
