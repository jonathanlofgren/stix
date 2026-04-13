import { create } from 'zustand';
import type {
  Piece, ConnectorPiece, PolePiece, PlatePiece, PlateSize, ConnectorType, Design, Inventory,
  Direction, Color, PoleLength, Vec3,
} from '../model/types';
import { plateEdgeLengths } from '../model/types';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';
import { cloneDefaultInventory } from '../catalog/defaultInventory';
import {
  addVec, directionVector, oppositeDirection, scaleVec, snapVec, vecEquals,
} from '../model/geometry';
import {
  IDENTITY_ROTATION, NUM_ROTATIONS, rotateSockets,
} from '../model/rotation';

const AUTOSAVE_KEY = 'project-play:design';
const INVENTORY_KEY = 'project-play:inventory';
const PLATE_OPACITY_KEY = 'project-play:plateOpacity';

type PlacementMode =
  | { kind: 'idle' }
  | { kind: 'pole'; length: PoleLength; color: Color }
  | { kind: 'connector'; typeId: string }
  | { kind: 'plate'; size: PlateSize; color: Color };

export type PlateCandidate = {
  minCorner: Vec3;
  maxCorner: Vec3;
  // The in-plane axes (the two axes along which the plate has extent).
  // The third axis is the plane normal.
  inPlaneAxes: [0 | 1 | 2, 0 | 1 | 2];
};

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
  plateOpacity: number;
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  // Actions
  setMode: (m: PlacementMode) => void;
  setSelected: (id: string | null) => void;
  placeAtSocket: (target: OpenSocket) => string | undefined;
  placeStartingConnector: (typeId: string) => string | undefined;
  placePlate: (candidate: PlateCandidate, size: PlateSize, color: Color) => string | undefined;
  rotateConnector: (id: string, delta: number) => boolean;
  deletePiece: (id: string) => void;
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
  allConnectorTypes: () => ConnectorType[];
  connectorWorldPosition: (id: string) => Vec3 | null;
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

function persist(state: State) {
  try {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({ pieces: state.pieces } satisfies Design),
    );
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(state.inventory));
    localStorage.setItem(PLATE_OPACITY_KEY, String(state.plateOpacity));
  } catch { /* ignore */ }
}

function snapshot(state: State): Snapshot {
  return { pieces: state.pieces.map((p) => ({ ...p })) };
}

function posKey(v: Vec3): string {
  return `${v[0]},${v[1]},${v[2]}`;
}

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
function enumerateCandidates(pieces: Piece[], size: PlateSize): PlateCandidate[] {
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

        // Check the four edges each have an exact-length pole between them.
        // Edges: p1-p2 (length eA along ax1), p3-p4 (length eA along ax1),
        //        p1-p3 (length eB along ax2), p2-p4 (length eB along ax2).
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
function validatePlates(pieces: Piece[]): Piece[] {
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
    // Identify the two in-plane axes (nonzero diff).
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
    plateOpacity: loadPlateOpacity(),
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
      if (piece.kind !== 'pole') return null;
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

    placePlate: (candidate, size, color) => {
      const state = get();
      // Re-verify the candidate still matches (design may have changed).
      const still = enumerateCandidates(state.pieces, size).some(
        (c) => vecEquals(c.minCorner, candidate.minCorner) && vecEquals(c.maxCorner, candidate.maxCorner),
      );
      if (!still) return undefined;
      const snap = snapshot(state);
      const piece: PlatePiece = {
        id: uid('pl'),
        kind: 'plate',
        size,
        color,
        minCorner: candidate.minCorner,
        maxCorner: candidate.maxCorner,
      };
      const next = { ...state, pieces: [...state.pieces, piece], undoStack: [...state.undoStack, snap], redoStack: [] };
      persist(next as State);
      set(next);
      return piece.id;
    },

    candidatePlates: (size) => enumerateCandidates(get().pieces, size),

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
      const validated = validatePlates(newPieces);
      const next = { ...state, pieces: validated, undoStack: [...state.undoStack, snap], redoStack: [] };
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

    setInventoryPlate: (size, color, n) => {
      const state = get();
      const key = `${size}-${color}`;
      const plates = { ...state.inventory.plates };
      if (n == null) delete plates[key];
      else plates[key] = n;
      const next = { ...state, inventory: { ...state.inventory, plates } };
      persist(next as State);
      set(next);
    },

    resetInventory: () => {
      const state = get();
      const next = { ...state, inventory: cloneDefaultInventory() };
      persist(next as State);
      set(next);
    },

    setPlateOpacity: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      set({ plateOpacity: clamped });
      persist(get());
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
      const validated = validatePlates(resolved);
      const next = {
        ...state,
        pieces: validated,
        undoStack: [...state.undoStack, snap],
        redoStack: [],
      };
      persist(next as State);
      set(next);
    },
  };
});

