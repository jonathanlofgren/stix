import { useState } from 'react';
import type { PolePiece } from '../model/types';
import { useDesignStore } from '../store/designStore';
import { addVec, directionVector, scaleVec } from '../model/geometry';
import { Outlines } from '@react-three/drei';
import {
  buildMaterial, BUILD_OUTLINE_COLOR, BUILD_OUTLINE_THICKNESS,
  HOVER_POLE, POLE_COLOR, SELECTED_COLOR, type BuildAppearance,
} from './constants';
import { poleGeometry } from './geometries';

type Props = {
  piece: PolePiece;
  selected: boolean;
  onSelect: (id: string, opts?: { additive?: boolean }) => void;
  build?: BuildAppearance;
};

export function PoleMesh({ piece, selected, onSelect, build }: Props) {
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

  const mat = build
    ? buildMaterial(build, POLE_COLOR[piece.color])
    : { color: selected ? SELECTED_COLOR : hover ? HOVER_POLE : POLE_COLOR[piece.color] };
  const interactive = !build;

  return (
    <mesh
      position={midPos}
      rotation={rotation}
      geometry={poleGeometry(piece.length)}
      raycast={build === 'ghost' ? () => null : undefined}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); setHover(true); } : undefined}
      onPointerOut={interactive ? () => setHover(false) : undefined}
      onClick={interactive ? (e) => {
        e.stopPropagation();
        onSelect(piece.id, { additive: e.metaKey || e.ctrlKey });
      } : undefined}
    >
      <meshStandardMaterial roughness={0.3} {...mat} />
      {build === 'current' && <Outlines thickness={BUILD_OUTLINE_THICKNESS} color={BUILD_OUTLINE_COLOR} />}
    </mesh>
  );
}
