import { useState } from 'react';
import type { OpenSocket } from '../store/designStore';

type Props = {
  socket: OpenSocket;
  enabled: boolean;
  onClick: (s: OpenSocket) => void;
};

export function SocketHandle({ socket, enabled, onClick }: Props) {
  const [hover, setHover] = useState(false);
  const color = !enabled ? '#666' : hover ? '#fde047' : '#22c55e';

  return (
    <mesh
      position={socket.worldPos}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (enabled) onClick(socket);
      }}
    >
      <sphereGeometry args={[0.08, 16, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hover ? 0.6 : 0.3} transparent opacity={enabled ? 0.95 : 0.35} />
    </mesh>
  );
}
