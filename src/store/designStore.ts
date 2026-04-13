import { create } from 'zustand';
import type {
  Piece, ConnectorPiece, PolePiece, ConnectorType, Design, Inventory,
  Direction, Color, PoleLength, Vec3,
} from '../model/types';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';
import {
  addVec, directionVector, oppositeDirection, scaleVec, snapVec, vecEquals,
} from '../model/geometry';
import {
  IDENTITY_ROTATION, NUM_ROTATIONS, rotateSockets,
} from '../model/rotation';

const AUTOSAVE_KEY = 'project-play:design';
const INVENTORY_KEY = 'project-play:inventory';

type PlacementMode =
  | { kind: 'idle' }
  | { kind: 'pole'; length: PoleLength; color: Color }
  | { kind: 'connector'; typeId: string };

// An open socket is either a connector-socket or a pole-free-end.
export type OpenSocket =
  | { kind: 'connector-socket'; pieceId: string; socket: Direction; worldPos: Vec3 }
  | { kind: 'pole-end'; poleId: string; direction: Direction; worldPos: Vec3 };

type Snapshot = {
  pieces: Piece[];
};

type State = {
  pieces: Piece[];
  inventory: Inventory;
  mode: PlacementMode;
  selectedId: string | null;
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  // Actions
  setMode: (m: PlacementMode) => void;
  setSelected: (id: string | null) => void;
  placeAtSocket: (target: OpenSocket) => string | undefined;
  placeStartingConnector: (typeId: string) => string | undefined;
  rotateConnector: (id: string, delta: number) => boolean;
  deletePiece: (id: string) => void;
  resetDesign: () => void;
  setInventoryConnector: (typeId: string, n: number | null) => void;
  setInventoryPole: (length: PoleLength, color: Color, n: number | null) => void;
  undo: () => void;
  redo: () => void;
  exportDesign: () => Design;
  importDesign: (d: Design) => void;

  // Derived
  allConnectorTypes: () => ConnectorType[];
  connectorWorldPosition: (id: string) => Vec3 | null;
  connectorEffectiveSockets: (piece: ConnectorPiece) => Direction[];
  openSockets: () => OpenSocket[];
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

function loadInventory(): Inventory {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    if (raw) return JSON.parse(raw) as Inventory;
  } catch { /* ignore */ }
  return { connectors: {}, poles: {} };
}

function loadAutosave(): Piece[] {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Design;
      return d.pieces;
    }
  } catch { /* ignore */ }
  const seed: ConnectorPiece = {
    id: uid('c'),
    kind: 'connector',
    typeId: 'plus',
    position: [0, 0, 0],
    rotation: IDENTITY_ROTATION,
  };
  return [seed];
}

function persist(state: State) {
  try {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({ pieces: state.pieces } satisfies Design),
    );
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(state.inventory));
  } catch { /* ignore */ }
}

function snapshot(state: State): Snapshot {
  return { pieces: state.pieces.map((p) => ({ ...p })) };
}

// After any placement, connect open pole-ends that coincide with an open socket on a connector.
function resolveConnections(pieces: Piece[], connectorTypes: ConnectorType[]): Piece[] {
  let current = pieces;
  let changed = true;
  while (changed) {
    changed = false;
    const connectors = current.filter((p): p is ConnectorPiece => p.kind === 'connector');
    const usedSocket = (connectorId: string, socket: Direction): boolean =>
      current.some((x) => x.kind === 'pole' && (
        (x.from.pieceId === connectorId && x.from.socket === socket) ||
        (x.to?.pieceId === connectorId && x.to.socket === socket)
      ));

    for (const p of current) {
      if (p.kind !== 'pole' || p.to) continue;
      const anchor = current.find((x) => x.id === p.from.pieceId);
      if (!anchor || anchor.kind !== 'connector') continue;
      const dir = p.from.socket;
      const endPos: Vec3 = snapVec(addVec(anchor.position, scaleVec(directionVector(dir), p.length)));

      const target = connectors.find((c) => c.id !== anchor.id && vecEquals(c.position, endPos));
      if (!target) continue;

      const type = connectorTypes.find((t) => t.id === target.typeId);
      if (!type) continue;
      const effective = rotateSockets(type.sockets, target.rotation);
      const needed = oppositeDirection(dir);
      if (!effective.includes(needed)) continue;
      if (usedSocket(target.id, needed)) continue;

      current = current.map((x) =>
        x.id === p.id && x.kind === 'pole'
          ? { ...x, to: { pieceId: target.id, socket: needed } }
          : x,
      );
      changed = true;
    }
  }
  return current;
}

// Find the rotation of `baseSockets` that covers the maximum number of `required` directions,
// while at minimum always covering `mustInclude`. Returns null if mustInclude can never be covered.
function findBestRotation(
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

export const useDesignStore = create<State>((set, get) => {
  return {
    pieces: loadAutosave(),
    inventory: loadInventory(),
    mode: { kind: 'idle' },
    selectedId: null,
    undoStack: [],
    redoStack: [],

    setMode: (mode) => {
      if (mode.kind !== 'idle') set({ mode, selectedId: null });
      else set({ mode });
    },
    setSelected: (id) => set({ selectedId: id }),

    allConnectorTypes: () => DEFAULT_CONNECTORS,

    connectorEffectiveSockets: (piece) => {
      const type = get().allConnectorTypes().find((t) => t.id === piece.typeId);
      if (!type) return [];
      return rotateSockets(type.sockets, piece.rotation);
    },

    connectorWorldPosition: (id) => {
      const piece = get().pieces.find((p) => p.id === id);
      if (!piece) return null;
      if (piece.kind === 'connector') return piece.position;
      // Pole: position is anchored via from.
      const anchor = get().pieces.find((p) => p.id === piece.from.pieceId);
      if (!anchor || anchor.kind !== 'connector') return null;
      return anchor.position;
    },

    openSockets: () => {
      const { pieces } = get();
      const api = get();
      const results: OpenSocket[] = [];

      // Find which (connectorId, socket) pairs are used by poles.
      const used = new Set<string>();
      for (const p of pieces) {
        if (p.kind !== 'pole') continue;
        used.add(`${p.from.pieceId}:${p.from.socket}`);
        if (p.to) used.add(`${p.to.pieceId}:${p.to.socket}`);
      }

      for (const p of pieces) {
        if (p.kind !== 'connector') continue;
        const sockets = api.connectorEffectiveSockets(p);
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

      // Pole free ends.
      for (const p of pieces) {
        if (p.kind !== 'pole') continue;
        if (p.to) continue;
        const anchor = pieces.find((x) => x.id === p.from.pieceId);
        if (!anchor || anchor.kind !== 'connector') continue;
        const dir = p.from.socket;
        // Endpoint of pole = anchor.position + dir * length
        const endPos = snapVec(addVec(anchor.position, scaleVec(directionVector(dir), p.length)));
        results.push({ kind: 'pole-end', poleId: p.id, direction: dir, worldPos: endPos });
      }

      return results;
    },

    placeAtSocket: (target) => {
      const state = get();
      const mode = state.mode;
      if (mode.kind === 'idle') return undefined;

      const snap = snapshot(state);
      const connectorTypes = state.allConnectorTypes();

      if (target.kind === 'connector-socket') {
        const anchor = state.pieces.find((p) => p.id === target.pieceId);
        if (!anchor || anchor.kind !== 'connector') return undefined;

        if (mode.kind === 'pole') {
          const stillOpen = state.openSockets().some(
            (o) => o.kind === 'connector-socket' && o.pieceId === target.pieceId && o.socket === target.socket,
          );
          if (!stillOpen) return undefined;
          const newPole: PolePiece = {
            id: uid('p'),
            kind: 'pole',
            length: mode.length,
            color: mode.color,
            from: { pieceId: target.pieceId, socket: target.socket },
          };
          const resolved = resolveConnections([...state.pieces, newPole], connectorTypes);
          const next = { ...state, pieces: resolved, undoStack: [...state.undoStack, snap], redoStack: [] };
          persist(next as State);
          set(next);
          return newPole.id;
        }
        return undefined;
      }

      if (target.kind === 'pole-end') {
        const pole = state.pieces.find((p) => p.id === target.poleId);
        if (!pole || pole.kind !== 'pole' || pole.to) return undefined;

        if (mode.kind === 'connector') {
          const type = connectorTypes.find((t) => t.id === mode.typeId);
          if (!type) return undefined;
          if (state.pieces.some((p) => p.kind === 'connector' && vecEquals(p.position, target.worldPos))) {
            return undefined;
          }

          // Gather ALL open pole-ends coincident with the placement position, plus the clicked one.
          // For each, the new connector needs a socket opposite to the pole's outgoing direction.
          const coincidentPoleEnds = state.openSockets().filter(
            (o) => o.kind === 'pole-end' && vecEquals(o.worldPos, target.worldPos),
          ) as Array<Extract<typeof target, { kind: 'pole-end' }>>;
          const requiredSocketSet = new Set<Direction>(
            coincidentPoleEnds.map((o) => oppositeDirection(o.direction)),
          );
          const mustInclude = oppositeDirection(target.direction);

          const rot = findBestRotation(type.sockets, requiredSocketSet, mustInclude);
          if (rot == null) {
            console.warn(`Connector ${type.id} cannot fit orientation needing socket ${mustInclude}`);
            return undefined;
          }
          const newConnector: ConnectorPiece = {
            id: uid('c'),
            kind: 'connector',
            typeId: type.id,
            position: target.worldPos,
            rotation: rot,
          };
          const newPieces: Piece[] = [...state.pieces, newConnector];
          const resolved = resolveConnections(newPieces, connectorTypes);
          const next = { ...state, pieces: resolved, undoStack: [...state.undoStack, snap], redoStack: [] };
          persist(next as State);
          set(next);
          return newConnector.id;
        }
      }
      return undefined;
    },

    placeStartingConnector: (typeId) => {
      const state = get();
      const type = state.allConnectorTypes().find((t) => t.id === typeId);
      if (!type) return undefined;
      const snap = snapshot(state);
      const piece: ConnectorPiece = {
        id: uid('c'),
        kind: 'connector',
        typeId,
        position: [0, 0, 0],
        rotation: IDENTITY_ROTATION,
      };
      const next = { ...state, pieces: [...state.pieces, piece], undoStack: [...state.undoStack, snap], redoStack: [] };
      persist(next as State);
      set(next);
      return piece.id;
    },

    rotateConnector: (id, delta) => {
      const state = get();
      const piece = state.pieces.find((p) => p.id === id);
      if (!piece || piece.kind !== 'connector') return false;
      const type = state.allConnectorTypes().find((t) => t.id === piece.typeId);
      if (!type) return false;

      const requiredSockets = new Set<Direction>();
      for (const p of state.pieces) {
        if (p.kind !== 'pole') continue;
        if (p.from.pieceId === id) requiredSockets.add(p.from.socket);
        if (p.to?.pieceId === id) requiredSockets.add(p.to.socket);
      }

      const socketKey = (sockets: Direction[]): string =>
        [...sockets].sort().join('|');
      const currentKey = socketKey(rotateSockets(type.sockets, piece.rotation));

      const step = delta >= 0 ? 1 : -1;
      let tried = 0;
      let candidate = piece.rotation;
      while (tried < NUM_ROTATIONS) {
        candidate = ((candidate + step) % NUM_ROTATIONS + NUM_ROTATIONS) % NUM_ROTATIONS;
        tried += 1;
        const rotated = rotateSockets(type.sockets, candidate);
        const rotatedSet = new Set(rotated);
        const allCovered = Array.from(requiredSockets).every((d) => rotatedSet.has(d));
        if (!allCovered) continue;
        // Skip rotations that are visually identical to the current one.
        if (socketKey(rotated) === currentKey) continue;
        const snap = snapshot(state);
        const newPieces = state.pieces.map((p) =>
          p.id === id && p.kind === 'connector' ? { ...p, rotation: candidate } : p,
        );
        const resolved = resolveConnections(newPieces, state.allConnectorTypes());
        const next = { ...state, pieces: resolved, undoStack: [...state.undoStack, snap], redoStack: [] };
        persist(next as State);
        set(next);
        return true;
      }
      return false;
    },

    deletePiece: (id) => {
      const state = get();
      const snap = snapshot(state);
      const newPieces: Piece[] = [];
      for (const p of state.pieces) {
        if (p.id === id) continue;
        if (p.kind !== 'pole') {
          newPieces.push(p);
          continue;
        }
        const fromGone = p.from.pieceId === id;
        const toGone = p.to?.pieceId === id;
        if (fromGone && toGone) {
          // Both anchors gone — pole has nowhere to live.
          continue;
        }
        if (fromGone) {
          // Reroot the pole to its `to` anchor, dropping the deleted side.
          if (!p.to) continue; // unreachable given fromGone && !toGone, but defensive
          const reoriented: PolePiece = {
            id: p.id,
            kind: 'pole',
            length: p.length,
            color: p.color,
            from: { pieceId: p.to.pieceId, socket: p.to.socket },
          };
          newPieces.push(reoriented);
          continue;
        }
        if (toGone) {
          const { to: _to, ...rest } = p;
          newPieces.push(rest);
          continue;
        }
        newPieces.push(p);
      }
      const next = { ...state, pieces: newPieces, undoStack: [...state.undoStack, snap], redoStack: [] };
      persist(next as State);
      set(next);
    },

    resetDesign: () => {
      const state = get();
      const snap = snapshot(state);
      const seed: ConnectorPiece = {
        id: uid('c'),
        kind: 'connector',
        typeId: 'plus',
        position: [0, 0, 0],
        rotation: IDENTITY_ROTATION,
      };
      const next = { ...state, pieces: [seed], undoStack: [...state.undoStack, snap], redoStack: [] };
      persist(next as State);
      set(next);
    },

    setInventoryConnector: (typeId, n) => {
      const state = get();
      const connectors = { ...state.inventory.connectors };
      if (n == null) delete connectors[typeId];
      else connectors[typeId] = n;
      const next = { ...state, inventory: { ...state.inventory, connectors } };
      persist(next as State);
      set(next);
    },

    setInventoryPole: (length, color, n) => {
      const state = get();
      const key = `${length}-${color}`;
      const poles = { ...state.inventory.poles };
      if (n == null) delete poles[key];
      else poles[key] = n;
      const next = { ...state, inventory: { ...state.inventory, poles } };
      persist(next as State);
      set(next);
    },

    undo: () => {
      const state = get();
      const prev = state.undoStack[state.undoStack.length - 1];
      if (!prev) return;
      const current: Snapshot = { pieces: state.pieces };
      const next = {
        ...state,
        pieces: prev.pieces,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, current],
      };
      persist(next as State);
      set(next);
    },

    redo: () => {
      const state = get();
      const nextSnap = state.redoStack[state.redoStack.length - 1];
      if (!nextSnap) return;
      const current: Snapshot = { pieces: state.pieces };
      const next = {
        ...state,
        pieces: nextSnap.pieces,
        undoStack: [...state.undoStack, current],
        redoStack: state.redoStack.slice(0, -1),
      };
      persist(next as State);
      set(next);
    },

    exportDesign: () => ({ pieces: get().pieces }),

    importDesign: (d) => {
      const state = get();
      const snap = snapshot(state);
      const resolved = resolveConnections(d.pieces, state.allConnectorTypes());
      const next = {
        ...state,
        pieces: resolved,
        undoStack: [...state.undoStack, snap],
        redoStack: [],
      };
      persist(next as State);
      set(next);
    },
  };
});

