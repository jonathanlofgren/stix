import { useState } from 'react';
import type { OpenSocket } from '../store/designStore';
import { SOCKET_DISABLED, SOCKET_ENABLED, SOCKET_HOVER } from './constants';
import { socketGeometry } from './geometries';

type Props = {
  socket: OpenSocket;
  enabled: boolean;
  onClick: (s: OpenSocket) => void;
};

export function SocketHandle({ socket, enabled, onClick }: Props) {
  const [hover, setHover] = useState(false);
  const color = !enabled ? SOCKET_DISABLED : hover ? SOCKET_HOVER : SOCKET_ENABLED;

  return (
    <mesh
      position={socket.worldPos}
      geometry={socketGeometry}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (enabled) onClick(socket);
      }}
    >
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hover ? 0.6 : 0.3}
        transparent
        opacity={enabled ? 0.95 : 0.35}
      />
    </mesh>
  );
}
