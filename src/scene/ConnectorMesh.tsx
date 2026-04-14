import type { ConnectorPiece, Direction } from '../model/types';
import { useDesignStore } from '../store/designStore';
import { useState } from 'react';
import {
  CONNECTOR_COLOR, HOVER_CONNECTOR, SELECTED_COLOR, STUB_LENGTH,
} from './constants';
import { jointGeometry, stubGeometry } from './geometries';

type Props = {
  piece: ConnectorPiece;
  selected: boolean;
  onSelect: (id: string, opts?: { additive?: boolean }) => void;
};

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
  const color = selected ? SELECTED_COLOR : hover ? HOVER_CONNECTOR : CONNECTOR_COLOR;

  return (
    <group
      position={piece.position}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(piece.id, { additive: e.metaKey || e.ctrlKey });
      }}
    >
      <mesh geometry={jointGeometry}>
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {sockets.map((s) => {
        const t = stubTransform(s);
        return (
          <mesh key={s} position={t.position} rotation={t.rotation} geometry={stubGeometry}>
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}
