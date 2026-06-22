import type { ConnectorPiece, Direction } from '../model/types';
import { useDesignStore } from '../store/designStore';
import { useState } from 'react';
import { Outlines } from '@react-three/drei';
import {
  buildMaterial, BUILD_OUTLINE_COLOR, BUILD_OUTLINE_THICKNESS,
  CONNECTOR_COLOR, HOVER_CONNECTOR, SELECTED_COLOR, STUB_LENGTH,
  type BuildAppearance,
} from './constants';
import { jointGeometry, stubGeometry } from './geometries';

type Props = {
  piece: ConnectorPiece;
  selected: boolean;
  onSelect: (id: string, opts?: { additive?: boolean }) => void;
  build?: BuildAppearance;
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

export function ConnectorMesh({ piece, selected, onSelect, build }: Props) {
  const connectorEffectiveSockets = useDesignStore((s) => s.connectorEffectiveSockets);
  const [hover, setHover] = useState(false);

  const sockets = connectorEffectiveSockets(piece);
  const mat = build
    ? buildMaterial(build, CONNECTOR_COLOR)
    : { color: selected ? SELECTED_COLOR : hover ? HOVER_CONNECTOR : CONNECTOR_COLOR };
  const interactive = !build;
  const raycast = build === 'ghost' ? () => null : undefined;

  return (
    <group
      position={piece.position}
      onPointerOver={interactive ? (e) => { e.stopPropagation(); setHover(true); } : undefined}
      onPointerOut={interactive ? () => setHover(false) : undefined}
      onClick={interactive ? (e) => {
        e.stopPropagation();
        onSelect(piece.id, { additive: e.metaKey || e.ctrlKey });
      } : undefined}
    >
      <mesh geometry={jointGeometry} raycast={raycast}>
        <meshStandardMaterial roughness={0.6} {...mat} />
        {build === 'current' && <Outlines thickness={BUILD_OUTLINE_THICKNESS} color={BUILD_OUTLINE_COLOR} />}
      </mesh>
      {sockets.map((s) => {
        const t = stubTransform(s);
        return (
          <mesh key={s} position={t.position} rotation={t.rotation} geometry={stubGeometry} raycast={raycast}>
            <meshStandardMaterial roughness={0.6} {...mat} />
            {build === 'current' && <Outlines thickness={BUILD_OUTLINE_THICKNESS} color={BUILD_OUTLINE_COLOR} />}
          </mesh>
        );
      })}
    </group>
  );
}
