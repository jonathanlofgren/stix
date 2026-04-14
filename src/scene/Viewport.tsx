import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { useDesignStore } from '../store/designStore';
import type { OpenSocket } from '../store/designStore';
import { ConnectorMesh } from './ConnectorMesh';
import { PoleMesh } from './PoleMesh';
import { PlateMesh } from './PlateMesh';
import { PlateGhost } from './PlateGhost';
import { SocketHandle } from './SocketHandle';
import { computeOpenSockets } from '../model/connections';
import { enumerateCandidates } from '../model/plates';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';

export function Viewport() {
  const pieces = useDesignStore((s) => s.pieces);
  const mode = useDesignStore((s) => s.mode);
  const placeAtSocket = useDesignStore((s) => s.placeAtSocket);
  const deletePiece = useDesignStore((s) => s.deletePiece);
  const rotateConnector = useDesignStore((s) => s.rotateConnector);
  const setMode = useDesignStore((s) => s.setMode);
  const selected = useDesignStore((s) => s.selectedId);
  const setSelected = useDesignStore((s) => s.setSelected);
  const placePlate = useDesignStore((s) => s.placePlate);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        deletePiece(selected);
        setSelected(null);
        return;
      }
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else setMode({ kind: 'idle' });
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
  }, [selected, deletePiece, rotateConnector, pieces, setMode, setSelected]);

  const sockets = useMemo(
    () => computeOpenSockets(pieces, DEFAULT_CONNECTORS),
    [pieces],
  );

  const candidates = useMemo(
    () => (mode.kind === 'plate' ? enumerateCandidates(pieces, mode.size) : []),
    [pieces, mode],
  );

  const socketEnabled = (s: OpenSocket): boolean => {
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

      {pieces.map((p) => {
        if (p.kind === 'connector') {
          return <ConnectorMesh key={p.id} piece={p} selected={selected === p.id} onSelect={setSelected} />;
        }
        if (p.kind === 'pole') {
          return <PoleMesh key={p.id} piece={p} selected={selected === p.id} onSelect={setSelected} />;
        }
        return <PlateMesh key={p.id} piece={p} selected={selected === p.id} onSelect={setSelected} />;
      })}

      {mode.kind === 'plate' && candidates.map((c) => (
        <PlateGhost
          key={`${c.minCorner.join(',')}-${c.maxCorner.join(',')}`}
          candidate={c}
          color={mode.color}
          onClick={(cand) => { placePlate(cand, mode.size, mode.color); }}
        />
      ))}

      {sockets.map((s) => {
        const key = s.kind === 'connector-socket' ? `${s.pieceId}-${s.socket}` : `pole-${s.poleId}`;
        return (
          <SocketHandle
            key={key}
            socket={s}
            enabled={socketEnabled(s)}
            onClick={(target) => {
              const newId = placeAtSocket(target);
              if (newId) {
                const placed = useDesignStore.getState().pieces.find((p) => p.id === newId);
                if (placed?.kind === 'connector') setSelected(newId);
              }
            }}
          />
        );
      })}
    </Canvas>
  );
}
