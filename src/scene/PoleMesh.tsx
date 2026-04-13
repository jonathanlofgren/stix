import { BackSide } from 'three';
import { useDesignStore } from '../store/designStore';
import type { PolePiece } from '../model/types';
import { addVec, directionVector, scaleVec } from '../model/geometry';
import { useState } from 'react';

type Props = {
  piece: PolePiece;
  selected: boolean;
  onSelect: (id: string) => void;
};

const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6',
  yellow: '#facc15',
};

const RADIUS = 0.06;
const OUTLINE_THICKNESS = 0.018;

export function PoleMesh({ piece, selected, onSelect }: Props) {
  const connectorWorldPosition = useDesignStore((s) => s.connectorWorldPosition);
  const [hover, setHover] = useState(false);

  const fromPos = connectorWorldPosition(piece.from.pieceId);
  if (!fromPos) return null;

  const dirVec = directionVector(piece.from.socket);
  const endPos = addVec(fromPos, scaleVec(dirVec, piece.length));
  const midPos: [number, number, number] = [
    (fromPos[0] + endPos[0]) / 2,
    (fromPos[1] + endPos[1]) / 2,
    (fromPos[2] + endPos[2]) / 2,
  ];

  let rotation: [number, number, number] = [0, 0, 0];
  if (piece.from.socket === '+X' || piece.from.socket === '-X') rotation = [0, 0, Math.PI / 2];
  else if (piece.from.socket === '+Z' || piece.from.socket === '-Z') rotation = [Math.PI / 2, 0, 0];

  const baseColor = COLOR_HEX[piece.color];
  const showOutline = selected || hover;
  const outlineColor = selected ? '#111827' : '#ffffff';

  return (
    <group
      position={midPos}
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(piece.id); }}
    >
      {showOutline && (
        <mesh>
          <cylinderGeometry args={[
            RADIUS + OUTLINE_THICKNESS,
            RADIUS + OUTLINE_THICKNESS,
            piece.length + OUTLINE_THICKNESS,
            16,
          ]} />
          <meshBasicMaterial color={outlineColor} side={BackSide} />
        </mesh>
      )}
      <mesh>
        <cylinderGeometry args={[RADIUS, RADIUS, piece.length, 16]} />
        <meshStandardMaterial color={baseColor} roughness={0.3} />
      </mesh>
    </group>
  );
}
