import { useState } from 'react';
import type { Color } from '../model/types';
import type { PlateCandidate } from '../store/designStore';

type Props = {
  candidate: PlateCandidate;
  color: Color;
  onClick: (c: PlateCandidate) => void;
};

const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6',
  yellow: '#facc15',
};

const THICKNESS = 0.04;

export function PlateGhost({ candidate, color, onClick }: Props) {
  const [hover, setHover] = useState(false);

  const { minCorner, maxCorner } = candidate;
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

  return (
    <mesh
      position={center}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onClick(candidate); }}
    >
      <boxGeometry args={box} />
      <meshStandardMaterial
        color={COLOR_HEX[color]}
        transparent
        opacity={hover ? 0.55 : 0.3}
        roughness={0.5}
      />
    </mesh>
  );
}
