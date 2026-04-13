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

export type PlateSize = '1x1' | '1x0.5';
export const ALL_PLATE_SIZES: PlateSize[] = ['1x1', '1x0.5'];

export type PlatePiece = {
  id: string;
  kind: 'plate';
  size: PlateSize;
  color: Color;
  // Opposite corners of the plate in world space. They share one coordinate (the
  // plane-normal axis); the other two coordinates differ by the plate's extents.
  // Stored with min <= max componentwise for canonical form.
  minCorner: Vec3;
  maxCorner: Vec3;
};

export type Piece = ConnectorPiece | PolePiece | PlatePiece;

export type Design = {
  pieces: Piece[];
};

export type Inventory = {
  connectors: Record<string, number>;
  poles: Record<string, number>;
  plates: Record<string, number>;
};

export function poleKey(length: PoleLength, color: Color): string {
  return `${length}-${color}`;
}

export function plateKey(size: PlateSize, color: Color): string {
  return `${size}-${color}`;
}

export function plateEdgeLengths(size: PlateSize): [number, number] {
  return size === '1x1' ? [1, 1] : [1, 0.5];
}
