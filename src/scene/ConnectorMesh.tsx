import type { ConnectorPiece } from '../model/types';
import { useState } from 'react';

type Props = {
  piece: ConnectorPiece;
  selected: boolean;
  onSelect: (id: string) => void;
};

const JOINT_RADIUS = 0.075;

export function ConnectorMesh({ piece, selected, onSelect }: Props) {
  const [hover, setHover] = useState(false);

  const color = selected ? '#ef4444' : hover ? '#3b82f6' : '#18181b';

  return (
    <mesh
      position={piece.position}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(piece.id); }}
    >
      <sphereGeometry args={[JOINT_RADIUS, 16, 12]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}
