import { create } from 'zustand';
import type {
  Piece, ConnectorPiece, PolePiece, PlatePiece, PlateSize, Design, Inventory,
  Direction, Color, PoleLength,
} from '../model/types';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';
import { cloneDefaultInventory } from '../catalog/defaultInventory';
import { oppositeDirection as oppositeDir, vecEquals } from '../model/geometry';
import { IDENTITY_ROTATION, NUM_ROTATIONS, rotateSockets } from '../model/rotation';
import {
  computeOpenSockets, connectorWorldPosition, effectiveSockets,
  findBestRotation, resolveConnections, type OpenSocket,
} from '../model/connections';
import { enumerateCandidates, validatePlates, type PlateCandidate } from '../model/plates';

const AUTOSAVE_KEY = 'project-play:design';
const INVENTORY_KEY = 'project-play:inventory';
const PLATE_OPACITY_KEY = 'project-play:plateOpacity';

export type { OpenSocket, PlateCandidate };

type PlacementMode =
  | { kind: 'idle' }
  | { kind: 'pole'; length: PoleLength; color: Color }
  | { kind: 'connector'; typeId: string }
  | { kind: 'plate'; size: PlateSize; color: Color };

type Snapshot = {
  pieces: Piece[];
};

type State = {
  pieces: Piece[];
  inventory: Inventory;
  mode: PlacementMode;
  selectedIds: Set<string>;
  plateOpacity: number;
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  // Actions
  setMode: (m: PlacementMode) => void;
  setSelected: (id: string | null, opts?: { additive?: boolean }) => void;
  clearSelection: () => void;
  placeAtSocket: (target: OpenSocket) => string | undefined;
  placeStartingConnector: (typeId: string) => string | undefined;
  placePlate: (candidate: PlateCandidate, size: PlateSize, color: Color) => string | undefined;
  rotateConnector: (id: string, delta: number) => boolean;
  deletePiece: (id: string) => void;
  deletePieces: (ids: string[]) => void;
  resetDesign: () => void;
  setInventoryConnector: (typeId: string, n: number | null) => void;
  setInventoryPole: (length: PoleLength, color: Color, n: number | null) => void;
  setInventoryPlate: (size: PlateSize, color: Color, n: number | null) => void;
  resetInventory: () => void;
  setPlateOpacity: (v: number) => void;
  undo: () => void;
  redo: () => void;
  exportDesign: () => Design;
  importDesign: (d: Design) => void;

  // Derived
  connectorWorldPosition: (id: string) => [number, number, number] | null;
  connectorEffectiveSockets: (piece: ConnectorPiece) => Direction[];
  openSockets: () => OpenSocket[];
  candidatePlates: (size: PlateSize) => PlateCandidate[];
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

function loadInventory(): Inventory {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Inventory>;
      return {
        connectors: parsed.connectors ?? {},
        poles: parsed.poles ?? {},
        plates: parsed.plates ?? {},
      };
    }
  } catch { /* ignore */ }
  return cloneDefaultInventory();
}

function loadPlateOpacity(): number {
  try {
    const raw = localStorage.getItem(PLATE_OPACITY_KEY);
    if (raw) {
      const v = parseFloat(raw);
      if (!Number.isNaN(v) && v >= 0 && v <= 1) return v;
    }
  } catch { /* ignore */ }
  return 1;
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

function snapshot(pieces: Piece[]): Snapshot {
  return { pieces: pieces.map((p) => ({ ...p })) };
}

export const useDesignStore = create<State>((set, get) => ({
  pieces: loadAutosave(),
  inventory: loadInventory(),
  mode: { kind: 'idle' },
  selectedIds: new Set<string>(),
  plateOpacity: loadPlateOpacity(),
  undoStack: [],
  redoStack: [],

  setMode: (mode) => set(mode.kind === 'idle' ? { mode } : { mode, selectedIds: new Set() }),
  setSelected: (id, opts) => set((s) => {
    if (id == null) return { selectedIds: new Set() };
    if (opts?.additive) {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }
    return { selectedIds: new Set([id]) };
  }),
  clearSelection: () => set({ selectedIds: new Set() }),

  connectorEffectiveSockets: (piece) => effectiveSockets(piece, DEFAULT_CONNECTORS),
  connectorWorldPosition: (id) => connectorWorldPosition(get().pieces, id),
  openSockets: () => computeOpenSockets(get().pieces, DEFAULT_CONNECTORS),
  candidatePlates: (size) => enumerateCandidates(get().pieces, size),

  placeAtSocket: (target) => {
    const { pieces, mode } = get();
    if (mode.kind === 'idle') return undefined;

    const snap = snapshot(pieces);

    if (target.kind === 'connector-socket') {
      const anchor = pieces.find((p) => p.id === target.pieceId);
      if (!anchor || anchor.kind !== 'connector') return undefined;

      if (mode.kind === 'pole') {
        const stillOpen = computeOpenSockets(pieces, DEFAULT_CONNECTORS).some(
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
        const resolved = resolveConnections([...pieces, newPole], DEFAULT_CONNECTORS);
        set((s) => ({ pieces: resolved, undoStack: [...s.undoStack, snap], redoStack: [] }));
        return newPole.id;
      }
      return undefined;
    }

    if (target.kind === 'pole-end') {
      const pole = pieces.find((p) => p.id === target.poleId);
      if (!pole || pole.kind !== 'pole' || pole.to) return undefined;

      if (mode.kind === 'connector') {
        const type = DEFAULT_CONNECTORS.find((t) => t.id === mode.typeId);
        if (!type) return undefined;
        if (pieces.some((p) => p.kind === 'connector' && vecEquals(p.position, target.worldPos))) {
          return undefined;
        }

        // Gather ALL open pole-ends coincident with the placement position, plus the clicked one.
        // For each, the new connector needs a socket opposite to the pole's outgoing direction.
        const coincidentPoleEnds = computeOpenSockets(pieces, DEFAULT_CONNECTORS).filter(
          (o) => o.kind === 'pole-end' && vecEquals(o.worldPos, target.worldPos),
        ) as Array<Extract<OpenSocket, { kind: 'pole-end' }>>;
        const requiredSocketSet = new Set<Direction>(
          coincidentPoleEnds.map((o) => oppositeDir(o.direction)),
        );
        const mustInclude = oppositeDir(target.direction);

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
        const resolved = resolveConnections([...pieces, newConnector], DEFAULT_CONNECTORS);
        set((s) => ({ pieces: resolved, undoStack: [...s.undoStack, snap], redoStack: [] }));
        return newConnector.id;
      }
    }
    return undefined;
  },

  placeStartingConnector: (typeId) => {
    const { pieces } = get();
    const type = DEFAULT_CONNECTORS.find((t) => t.id === typeId);
    if (!type) return undefined;
    const snap = snapshot(pieces);
    const piece: ConnectorPiece = {
      id: uid('c'),
      kind: 'connector',
      typeId,
      position: [0, 0, 0],
      rotation: IDENTITY_ROTATION,
    };
    set((s) => ({ pieces: [...s.pieces, piece], undoStack: [...s.undoStack, snap], redoStack: [] }));
    return piece.id;
  },

  placePlate: (candidate, size, color) => {
    const { pieces } = get();
    // Re-verify the candidate still matches (design may have changed).
    const still = enumerateCandidates(pieces, size).some(
      (c) => vecEquals(c.minCorner, candidate.minCorner) && vecEquals(c.maxCorner, candidate.maxCorner),
    );
    if (!still) return undefined;
    const snap = snapshot(pieces);
    const piece: PlatePiece = {
      id: uid('pl'),
      kind: 'plate',
      size,
      color,
      minCorner: candidate.minCorner,
      maxCorner: candidate.maxCorner,
    };
    set((s) => ({ pieces: [...s.pieces, piece], undoStack: [...s.undoStack, snap], redoStack: [] }));
    return piece.id;
  },

  rotateConnector: (id, delta) => {
    const { pieces } = get();
    const piece = pieces.find((p) => p.id === id);
    if (!piece || piece.kind !== 'connector') return false;
    const type = DEFAULT_CONNECTORS.find((t) => t.id === piece.typeId);
    if (!type) return false;

    const requiredSockets = new Set<Direction>();
    for (const p of pieces) {
      if (p.kind !== 'pole') continue;
      if (p.from.pieceId === id) requiredSockets.add(p.from.socket);
      if (p.to?.pieceId === id) requiredSockets.add(p.to.socket);
    }

    const socketKey = (sockets: Direction[]): string => [...sockets].sort().join('|');
    const currentKey = socketKey(rotateSockets(type.sockets, piece.rotation));

    const step = delta >= 0 ? 1 : -1;
    let candidate = piece.rotation;
    for (let tried = 0; tried < NUM_ROTATIONS; tried += 1) {
      candidate = ((candidate + step) % NUM_ROTATIONS + NUM_ROTATIONS) % NUM_ROTATIONS;
      const rotated = rotateSockets(type.sockets, candidate);
      const rotatedSet = new Set(rotated);
      const allCovered = Array.from(requiredSockets).every((d) => rotatedSet.has(d));
      if (!allCovered) continue;
      // Skip rotations that are visually identical to the current one.
      if (socketKey(rotated) === currentKey) continue;
      const snap = snapshot(pieces);
      const newPieces = pieces.map((p) =>
        p.id === id && p.kind === 'connector' ? { ...p, rotation: candidate } : p,
      );
      const resolved = resolveConnections(newPieces, DEFAULT_CONNECTORS);
      set((s) => ({ pieces: resolved, undoStack: [...s.undoStack, snap], redoStack: [] }));
      return true;
    }
    return false;
  },

  deletePiece: (id) => get().deletePieces([id]),

  deletePieces: (ids) => {
    if (ids.length === 0) return;
    const { pieces } = get();
    const toDelete = new Set(ids);
    const snap = snapshot(pieces);
    const newPieces: Piece[] = [];
    for (const p of pieces) {
      if (toDelete.has(p.id)) continue;
      if (p.kind !== 'pole') {
        newPieces.push(p);
        continue;
      }
      const fromGone = toDelete.has(p.from.pieceId);
      const toGone = p.to ? toDelete.has(p.to.pieceId) : false;
      if (fromGone && toGone) continue; // both anchors gone
      if (fromGone) {
        // Reroot the pole to its `to` anchor, dropping the deleted side.
        if (!p.to) continue;
        newPieces.push({
          id: p.id,
          kind: 'pole',
          length: p.length,
          color: p.color,
          from: { pieceId: p.to.pieceId, socket: p.to.socket },
        });
        continue;
      }
      if (toGone) {
        const { to: _to, ...rest } = p;
        newPieces.push(rest);
        continue;
      }
      newPieces.push(p);
    }
    const validated = validatePlates(newPieces);
    set((s) => ({
      pieces: validated,
      selectedIds: new Set([...s.selectedIds].filter((x) => !toDelete.has(x))),
      undoStack: [...s.undoStack, snap],
      redoStack: [],
    }));
  },

  resetDesign: () => {
    const { pieces } = get();
    const snap = snapshot(pieces);
    const seed: ConnectorPiece = {
      id: uid('c'),
      kind: 'connector',
      typeId: 'plus',
      position: [0, 0, 0],
      rotation: IDENTITY_ROTATION,
    };
    set((s) => ({ pieces: [seed], undoStack: [...s.undoStack, snap], redoStack: [] }));
  },

  setInventoryConnector: (typeId, n) =>
    set((s) => {
      const connectors = { ...s.inventory.connectors };
      if (n == null) delete connectors[typeId];
      else connectors[typeId] = n;
      return { inventory: { ...s.inventory, connectors } };
    }),

  setInventoryPole: (length, color, n) =>
    set((s) => {
      const key = `${length}-${color}`;
      const poles = { ...s.inventory.poles };
      if (n == null) delete poles[key];
      else poles[key] = n;
      return { inventory: { ...s.inventory, poles } };
    }),

  setInventoryPlate: (size, color, n) =>
    set((s) => {
      const key = `${size}-${color}`;
      const plates = { ...s.inventory.plates };
      if (n == null) delete plates[key];
      else plates[key] = n;
      return { inventory: { ...s.inventory, plates } };
    }),

  resetInventory: () => set({ inventory: cloneDefaultInventory() }),

  setPlateOpacity: (v) => set({ plateOpacity: Math.max(0, Math.min(1, v)) }),

  undo: () => set((s) => {
    const prev = s.undoStack[s.undoStack.length - 1];
    if (!prev) return {};
    return {
      pieces: prev.pieces,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, { pieces: s.pieces }],
    };
  }),

  redo: () => set((s) => {
    const nextSnap = s.redoStack[s.redoStack.length - 1];
    if (!nextSnap) return {};
    return {
      pieces: nextSnap.pieces,
      undoStack: [...s.undoStack, { pieces: s.pieces }],
      redoStack: s.redoStack.slice(0, -1),
    };
  }),

  exportDesign: () => ({ pieces: get().pieces }),

  importDesign: (d) => {
    const { pieces } = get();
    const snap = snapshot(pieces);
    const resolved = resolveConnections(d.pieces, DEFAULT_CONNECTORS);
    const validated = validatePlates(resolved);
    set((s) => ({ pieces: validated, undoStack: [...s.undoStack, snap], redoStack: [] }));
  },
}));

// Persistence: one subscription writes the persisted slices whenever they change.
let lastPieces: Piece[] | null = null;
let lastInventory: Inventory | null = null;
let lastOpacity: number | null = null;
useDesignStore.subscribe((state) => {
  try {
    if (state.pieces !== lastPieces) {
      lastPieces = state.pieces;
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ pieces: state.pieces } satisfies Design));
    }
    if (state.inventory !== lastInventory) {
      lastInventory = state.inventory;
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(state.inventory));
    }
    if (state.plateOpacity !== lastOpacity) {
      lastOpacity = state.plateOpacity;
      localStorage.setItem(PLATE_OPACITY_KEY, String(state.plateOpacity));
    }
  } catch { /* ignore */ }
});
