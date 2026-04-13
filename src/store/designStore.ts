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
  IDENTITY_ROTATION, NUM_ROTATIONS, findRotationWithSocket, rotateSockets,
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
  customConnectorTypes: ConnectorType[];
};

type State = {
  pieces: Piece[];
  customConnectorTypes: ConnectorType[];
  inventory: Inventory;
  mode: PlacementMode;
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  // Actions
  setMode: (m: PlacementMode) => void;
  placeAtSocket: (target: OpenSocket) => void;
  rotateConnector: (id: string, delta: number) => boolean;
  deletePiece: (id: string) => void;
  resetDesign: () => void;
  addCustomConnector: (t: ConnectorType) => void;
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

function loadAutosave(): { pieces: Piece[]; customConnectorTypes: ConnectorType[] } {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Design;
      return { pieces: d.pieces, customConnectorTypes: d.customConnectorTypes };
    }
  } catch { /* ignore */ }
  // Seed with a single connector at origin so user has something to click.
  const seed: ConnectorPiece = {
    id: uid('c'),
    kind: 'connector',
    typeId: 'plus',
    position: [0, 0, 0],
    rotation: IDENTITY_ROTATION,
  };
  return { pieces: [seed], customConnectorTypes: [] };
}

function persist(state: State) {
  try {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({
        pieces: state.pieces,
        customConnectorTypes: state.customConnectorTypes,
      } satisfies Design),
    );
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(state.inventory));
  } catch { /* ignore */ }
}

function snapshot(state: State): Snapshot {
  return {
    pieces: state.pieces.map((p) => ({ ...p })),
    customConnectorTypes: state.customConnectorTypes.map((t) => ({ ...t })),
  };
}

export const useDesignStore = create<State>((set, get) => {
  const autosaved = loadAutosave();

  return {
    pieces: autosaved.pieces,
    customConnectorTypes: autosaved.customConnectorTypes,
    inventory: loadInventory(),
    mode: { kind: 'idle' },
    undoStack: [],
    redoStack: [],

    setMode: (mode) => set({ mode }),

    allConnectorTypes: () => [...DEFAULT_CONNECTORS, ...get().customConnectorTypes],

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
      if (mode.kind === 'idle') return;

      // Push undo snapshot BEFORE mutation.
      const snap = snapshot(state);

      if (target.kind === 'connector-socket') {
        const anchor = state.pieces.find((p) => p.id === target.pieceId);
        if (!anchor || anchor.kind !== 'connector') return;

        if (mode.kind === 'pole') {
          // Check socket free.
          const stillOpen = state.openSockets().some(
            (o) => o.kind === 'connector-socket' && o.pieceId === target.pieceId && o.socket === target.socket,
          );
          if (!stillOpen) return;
          const newPole: PolePiece = {
            id: uid('p'),
            kind: 'pole',
            length: mode.length,
            color: mode.color,
            from: { pieceId: target.pieceId, socket: target.socket },
          };
          const next = { ...state, pieces: [...state.pieces, newPole], undoStack: [...state.undoStack, snap], redoStack: [] };
          persist(next as State);
          set(next);
        } else if (mode.kind === 'connector') {
          // User is dropping a connector directly onto a connector socket? That doesn't physically
          // make sense — connectors need poles between them. Ignore.
          return;
        }
        return;
      }

      if (target.kind === 'pole-end') {
        const pole = state.pieces.find((p) => p.id === target.poleId);
        if (!pole || pole.kind !== 'pole' || pole.to) return;

        if (mode.kind === 'connector') {
          const type = state.allConnectorTypes().find((t) => t.id === mode.typeId);
          if (!type) return;
          // The connector's socket facing the pole must be the opposite of pole direction.
          const requiredSocket = oppositeDirection(target.direction);
          const rot = findRotationWithSocket(type.sockets, requiredSocket);
          if (rot == null) {
            console.warn(`Connector ${type.id} cannot fit orientation needing socket ${requiredSocket}`);
            return;
          }
          const newConnector: ConnectorPiece = {
            id: uid('c'),
            kind: 'connector',
            typeId: type.id,
            position: target.worldPos,
            rotation: rot,
          };
          // Check no existing connector at that position.
          if (state.pieces.some((p) => p.kind === 'connector' && vecEquals(p.position, target.worldPos))) {
            // Connect existing connector if present instead.
            return;
          }
          // Update the pole's `to` end.
          const updatedPole: PolePiece = {
            ...pole,
            to: { pieceId: newConnector.id, socket: requiredSocket },
          };
          const newPieces: Piece[] = [
            ...state.pieces.map((p) => (p.id === pole.id ? updatedPole : p)),
            newConnector,
          ];
          const next = { ...state, pieces: newPieces, undoStack: [...state.undoStack, snap], redoStack: [] };
          persist(next as State);
          set(next);
        } else if (mode.kind === 'pole') {
          // Can't extend a pole with a pole — you need a connector between them. Ignore.
          return;
        }
      }
    },

    rotateConnector: (id, delta) => {
      const state = get();
      const piece = state.pieces.find((p) => p.id === id);
      if (!piece || piece.kind !== 'connector') return false;
      const type = state.allConnectorTypes().find((t) => t.id === piece.typeId);
      if (!type) return false;

      // Sockets currently in use by connected poles (absolute world directions).
      const requiredSockets = new Set<Direction>();
      for (const p of state.pieces) {
        if (p.kind !== 'pole') continue;
        if (p.from.pieceId === id) requiredSockets.add(p.from.socket);
        if (p.to?.pieceId === id) requiredSockets.add(p.to.socket);
      }

      // Try rotations starting from current + delta, wrapping.
      const step = delta >= 0 ? 1 : -1;
      const count = delta >= 0 ? delta : -delta;
      let tried = 0;
      let candidate = piece.rotation;
      while (tried < NUM_ROTATIONS) {
        candidate = ((candidate + step) % NUM_ROTATIONS + NUM_ROTATIONS) % NUM_ROTATIONS;
        tried += 1;
        const rotated = new Set(rotateSockets(type.sockets, candidate));
        const allCovered = Array.from(requiredSockets).every((d) => rotated.has(d));
        if (!allCovered) continue;
        if (candidate === piece.rotation) continue;
        if (count > 1) {
          // Consume additional steps by continuing the loop.
          // (Rare case; typical usage is ±1.)
          if (tried < count) continue;
        }
        const snap = snapshot(state);
        const newPieces = state.pieces.map((p) =>
          p.id === id && p.kind === 'connector' ? { ...p, rotation: candidate } : p,
        );
        const next = { ...state, pieces: newPieces, undoStack: [...state.undoStack, snap], redoStack: [] };
        persist(next as State);
        set(next);
        return true;
      }
      return false;
    },

    deletePiece: (id) => {
      const state = get();
      const snap = snapshot(state);
      // Cascade: if deleting a connector, also delete poles connected to it.
      const piecesToRemove = new Set<string>([id]);
      for (const p of state.pieces) {
        if (p.kind === 'pole' && (p.from.pieceId === id || p.to?.pieceId === id)) {
          piecesToRemove.add(p.id);
        }
      }
      const newPieces = state.pieces.filter((p) => !piecesToRemove.has(p.id));
      // Also clear `to` references to deleted connectors on remaining poles (shouldn't happen given cascade).
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

    addCustomConnector: (t) => {
      const state = get();
      const snap = snapshot(state);
      const next = {
        ...state,
        customConnectorTypes: [...state.customConnectorTypes, t],
        undoStack: [...state.undoStack, snap],
        redoStack: [],
      };
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
      const current: Snapshot = { pieces: state.pieces, customConnectorTypes: state.customConnectorTypes };
      const next = {
        ...state,
        pieces: prev.pieces,
        customConnectorTypes: prev.customConnectorTypes,
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
      const current: Snapshot = { pieces: state.pieces, customConnectorTypes: state.customConnectorTypes };
      const next = {
        ...state,
        pieces: nextSnap.pieces,
        customConnectorTypes: nextSnap.customConnectorTypes,
        undoStack: [...state.undoStack, current],
        redoStack: state.redoStack.slice(0, -1),
      };
      persist(next as State);
      set(next);
    },

    exportDesign: () => ({
      pieces: get().pieces,
      customConnectorTypes: get().customConnectorTypes,
    }),

    importDesign: (d) => {
      const state = get();
      const snap = snapshot(state);
      const next = {
        ...state,
        pieces: d.pieces,
        customConnectorTypes: d.customConnectorTypes,
        undoStack: [...state.undoStack, snap],
        redoStack: [],
      };
      persist(next as State);
      set(next);
    },
  };
});

