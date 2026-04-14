import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { PlatePiece } from '../model/types';
import { useDesignStore } from '../store/designStore';
import { HOVER_PLATE, PLATE_COLOR, PLATE_THICKNESS, SELECTED_COLOR } from './constants';

type Props = {
  piece: PlatePiece;
  selected: boolean;
  onSelect: (id: string) => void;
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

export function PlateMesh({ piece, selected, onSelect }: Props) {
  const plateOpacity = useDesignStore((s) => s.plateOpacity);
  const [hover, setHover] = useState(false);

  const { center, box } = plateBoxDims(piece.minCorner, piece.maxCorner);
  const geometry = useMemo(() => new THREE.BoxGeometry(box[0], box[1], box[2]), [box[0], box[1], box[2]]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const color = selected ? SELECTED_COLOR : hover ? HOVER_PLATE : PLATE_COLOR[piece.color];

  return (
    <mesh
      position={center}
      geometry={geometry}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(piece.id); }}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        transparent
        opacity={plateOpacity}
      />
    </mesh>
  );
}
