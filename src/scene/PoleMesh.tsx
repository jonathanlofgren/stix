import { useState } from 'react';
import type { PolePiece } from '../model/types';
import { useDesignStore } from '../store/designStore';
import { addVec, directionVector, scaleVec } from '../model/geometry';
import { HOVER_POLE, POLE_COLOR, SELECTED_COLOR } from './constants';
import { poleGeometry } from './geometries';

type Props = {
  piece: PolePiece;
  selected: boolean;
  onSelect: (id: string) => void;
};

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

  const color = selected ? SELECTED_COLOR : hover ? HOVER_POLE : POLE_COLOR[piece.color];

  return (
    <mesh
      position={midPos}
      rotation={rotation}
      geometry={poleGeometry(piece.length)}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(piece.id); }}
    >
      <meshStandardMaterial color={color} roughness={0.3} />
    </mesh>
  );
}
