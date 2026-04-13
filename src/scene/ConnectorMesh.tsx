import type { ConnectorPiece, Direction } from '../model/types';
import { useDesignStore } from '../store/designStore';
import { useState } from 'react';

type Props = {
  piece: ConnectorPiece;
  selected: boolean;
  onSelect: (id: string) => void;
};

const JOINT_RADIUS = 0.075;
const STUB_RADIUS = 0.04;  // thinner than pole (0.06) so poles hide it
const STUB_LENGTH = 0.14;

function stubTransform(dir: Direction): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  const offset = STUB_LENGTH / 2;
  switch (dir) {
    case '+X': return { position: [offset, 0, 0], rotation: [0, 0, Math.PI / 2] };
    case '-X': return { position: [-offset, 0, 0], rotation: [0, 0, Math.PI / 2] };
    case '+Y': return { position: [0, offset, 0], rotation: [0, 0, 0] };
    case '-Y': return { position: [0, -offset, 0], rotation: [0, 0, 0] };
    case '+Z': return { position: [0, 0, offset], rotation: [Math.PI / 2, 0, 0] };
    case '-Z': return { position: [0, 0, -offset], rotation: [Math.PI / 2, 0, 0] };
  }
}

export function ConnectorMesh({ piece, selected, onSelect }: Props) {
  const connectorEffectiveSockets = useDesignStore((s) => s.connectorEffectiveSockets);
  const [hover, setHover] = useState(false);

  const sockets = connectorEffectiveSockets(piece);
  const color = selected ? '#ef4444' : hover ? '#3b82f6' : '#18181b';

  return (
    <group
      position={piece.position}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(piece.id); }}
    >
      <mesh>
        <sphereGeometry args={[JOINT_RADIUS, 16, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {sockets.map((s) => {
        const t = stubTransform(s);
        return (
          <mesh key={s} position={t.position} rotation={t.rotation}>
            <cylinderGeometry args={[STUB_RADIUS, STUB_RADIUS, STUB_LENGTH, 12]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}
