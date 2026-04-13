export type Direction = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z';

export const ALL_DIRECTIONS: Direction[] = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

export type Color = 'blue' | 'yellow';
export const ALL_COLORS: Color[] = ['blue', 'yellow'];

export type PoleLength = 0.5 | 1;
export const ALL_LENGTHS: PoleLength[] = [0.5, 1];

export type ConnectorType = {
  id: string;
  label: string;
  sockets: Direction[];
  builtIn?: boolean;
};

export type Vec3 = [number, number, number];

export type ConnectorPiece = {
  id: string;
  kind: 'connector';
  typeId: string;
  position: Vec3;
  rotation: number; // RotationId, index into cubic rotations (0..23)
};

export type PolePiece = {
  id: string;
  kind: 'pole';
  length: PoleLength;
  color: Color;
  // Anchored to a connector socket.
  from: { pieceId: string; socket: Direction };
  // Other endpoint, if a connector closes it off. Otherwise open.
  to?: { pieceId: string; socket: Direction };
};

export type Piece = ConnectorPiece | PolePiece;

export type Design = {
  pieces: Piece[];
};

export type Inventory = {
  // connector counts: keyed by connector typeId
  connectors: Record<string, number>;
  // pole counts: keyed by `${length}-${color}`
  poles: Record<string, number>;
};

export function poleKey(length: PoleLength, color: Color): string {
  return `${length}-${color}`;
}
