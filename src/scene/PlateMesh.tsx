import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { PlatePiece } from '../model/types';
import { useDesignStore } from '../store/designStore';
import { Outlines } from '@react-three/drei';
import {
  buildMaterial, BUILD_OUTLINE_COLOR, BUILD_OUTLINE_THICKNESS,
  HOVER_PLATE, PLATE_COLOR, PLATE_THICKNESS, SELECTED_COLOR,
  type BuildAppearance,
} from './constants';

type Props = {
  piece: PlatePiece;
  selected: boolean;
  onSelect: (id: string, opts?: { additive?: boolean }) => void;
  build?: BuildAppearance;
};

export function plateBoxDims(
  minCorner: [number, number, number],
  maxCorner: [number, number, number],
): { center: [number, number, number]; box: [number, number, number] } {
  const size: [number, number, number] = [
    maxCorner[0] - minCorner[0],
    maxCorner[1] - minCorner[1],
    maxCorner[2] - minCorner[2],
  ];
  const center: [number, number, number] = [
    (minCorner[0] + maxCorner[0]) / 2,
    (minCorner[1] + maxCorner[1]) / 2,
    (minCorner[2] + maxCorner[2]) / 2,
  ];
  const box: [number, number, number] = [
    size[0] === 0 ? PLATE_THICKNESS : size[0],
    size[1] === 0 ? PLATE_THICKNESS : size[1],
    size[2] === 0 ? PLATE_THICKNESS : size[2],
  ];
  return { center, box };
}

export function PlateMesh({ piece, selected, onSelect, build }: Props) {
  const plateOpacity = useDesignStore((s) => s.plateOpacity);
  const [hover, setHover] = useState(false);

  const { center, box } = plateBoxDims(piece.minCorner, piece.maxCorner);
  const geometry = useMemo(() => new THREE.BoxGeometry(box[0], box[1], box[2]), [box[0], box[1], box[2]]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const mat = build
    ? buildMaterial(build, PLATE_COLOR[piece.color], plateOpacity)
    : {
        color: selected ? SELECTED_COLOR : hover ? HOVER_PLATE : PLATE_COLOR[piece.color],
        transparent: true,
        opacity: plateOpacity,
      };
  const interactive = !build;

  return (
    <mesh
      position={center}
      geometry={geometry}
      raycast={build === 'ghost' ? () => null : undefined}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); setHover(true); } : undefined}
      onPointerOut={interactive ? () => setHover(false) : undefined}
      onClick={interactive ? (e) => {
        e.stopPropagation();
        onSelect(piece.id, { additive: e.metaKey || e.ctrlKey });
      } : undefined}
    >
      <meshStandardMaterial roughness={0.4} {...mat} />
      {build === 'current' && <Outlines thickness={BUILD_OUTLINE_THICKNESS} color={BUILD_OUTLINE_COLOR} />}
    </mesh>
  );
}
