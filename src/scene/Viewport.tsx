import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useState, useEffect } from 'react';
import { useDesignStore } from '../store/designStore';
import { ConnectorMesh } from './ConnectorMesh';
import { PoleMesh } from './PoleMesh';
import { SocketHandle } from './SocketHandle';

export function Viewport() {
  const pieces = useDesignStore((s) => s.pieces);
  const mode = useDesignStore((s) => s.mode);
  const placeAtSocket = useDesignStore((s) => s.placeAtSocket);
  const openSockets = useDesignStore((s) => s.openSockets);
  const deletePiece = useDesignStore((s) => s.deletePiece);
  const rotateConnector = useDesignStore((s) => s.rotateConnector);

  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        deletePiece(selected);
        setSelected(null);
        return;
      }
      if (e.key === 'Escape') {
        setSelected(null);
        return;
      }
      if ((e.key === 'r' || e.key === 'R') && selected) {
        const selectedPiece = pieces.find((p) => p.id === selected);
        if (selectedPiece?.kind === 'connector') {
          e.preventDefault();
          rotateConnector(selected, e.shiftKey ? -1 : 1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, deletePiece, rotateConnector, pieces]);

  const sockets = openSockets();

  // Which sockets are valid click targets under current mode?
  const socketEnabled = (idx: number): boolean => {
    const s = sockets[idx];
    if (mode.kind === 'idle') return false;
    if (s.kind === 'connector-socket' && mode.kind === 'pole') return true;
    if (s.kind === 'pole-end' && mode.kind === 'connector') return true;
    return false;
  };

  return (
    <Canvas camera={{ position: [4, 4, 6], fov: 45 }} shadows>
      <color attach="background" args={['#f4f4f5']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 7]} intensity={0.9} castShadow />
      <directionalLight position={[-5, -3, -5]} intensity={0.35} />

      <Grid
        args={[30, 30]}
        cellSize={1}
        cellColor="#d4d4d8"
        sectionSize={5}
        sectionColor="#a1a1aa"
        fadeDistance={30}
        infiniteGrid
        position={[0, -1.5, 0]}
      />

      <OrbitControls makeDefault />

      {pieces.map((p) =>
        p.kind === 'connector' ? (
          <ConnectorMesh key={p.id} piece={p} selected={selected === p.id} onSelect={setSelected} />
        ) : (
          <PoleMesh key={p.id} piece={p} selected={selected === p.id} onSelect={setSelected} />
        ),
      )}

      {sockets.map((s, idx) => {
        const key = s.kind === 'connector-socket' ? `${s.pieceId}-${s.socket}` : `pole-${s.poleId}`;
        return (
          <SocketHandle
            key={key}
            socket={s}
            enabled={socketEnabled(idx)}
            onClick={placeAtSocket}
          />
        );
      })}
    </Canvas>
  );
}
