import { useState } from 'react';
import type { PlatePiece } from '../model/types';
import { useDesignStore } from '../store/designStore';

type Props = {
  piece: PlatePiece;
  selected: boolean;
  onSelect: (id: string) => void;
};

const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6',
  yellow: '#facc15',
};

const THICKNESS = 0.04;

function plateGeometry(minCorner: [number, number, number], maxCorner: [number, number, number]) {
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
    size[0] === 0 ? THICKNESS : size[0],
    size[1] === 0 ? THICKNESS : size[1],
    size[2] === 0 ? THICKNESS : size[2],
  ];
  return { center, box };
}

export function PlateMesh({ piece, selected, onSelect }: Props) {
  const plateOpacity = useDesignStore((s) => s.plateOpacity);
  const [hover, setHover] = useState(false);

  const { center, box } = plateGeometry(piece.minCorner, piece.maxCorner);
  const color = selected ? '#ef4444' : hover ? '#60a5fa' : COLOR_HEX[piece.color];

  return (
    <mesh
      position={center}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(piece.id); }}
    >
      <boxGeometry args={box} />
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        transparent={plateOpacity < 1}
        opacity={plateOpacity}
      />
    </mesh>
  );
}
