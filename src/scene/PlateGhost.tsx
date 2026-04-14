import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { Color } from '../model/types';
import type { PlateCandidate } from '../store/designStore';
import { PLATE_COLOR } from './constants';
import { plateBoxDims } from './PlateMesh';

type Props = {
  candidate: PlateCandidate;
  color: Color;
  onClick: (c: PlateCandidate) => void;
};

export function PlateGhost({ candidate, color, onClick }: Props) {
  const [hover, setHover] = useState(false);
  const { center, box } = plateBoxDims(candidate.minCorner, candidate.maxCorner);
  const geometry = useMemo(() => new THREE.BoxGeometry(box[0], box[1], box[2]), [box[0], box[1], box[2]]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      position={center}
      geometry={geometry}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onClick(candidate); }}
    >
      <meshStandardMaterial
        color={PLATE_COLOR[color]}
        transparent
        opacity={hover ? 0.55 : 0.3}
        roughness={0.5}
      />
    </mesh>
  );
}
