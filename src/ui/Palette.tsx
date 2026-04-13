import { useState } from 'react';
import { useDesignStore } from '../store/designStore';
import { ALL_COLORS, ALL_DIRECTIONS, ALL_LENGTHS } from '../model/types';
import type { Color, Direction, PoleLength, ConnectorType } from '../model/types';

export function Palette() {
  const mode = useDesignStore((s) => s.mode);
  const setMode = useDesignStore((s) => s.setMode);
  const connectorTypes = useDesignStore((s) => s.allConnectorTypes)();
  const addCustomConnector = useDesignStore((s) => s.addCustomConnector);
  const placeStartingConnector = useDesignStore((s) => s.placeStartingConnector);
  const sceneEmpty = useDesignStore((s) => s.pieces.length === 0);

  const [showCustom, setShowCustom] = useState(false);

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={sectionHeader}>Poles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ALL_LENGTHS.flatMap((length: PoleLength) =>
            ALL_COLORS.map((color: Color) => {
              const active = mode.kind === 'pole' && mode.length === length && mode.color === color;
              return (
                <button
                  key={`${length}-${color}`}
                  onClick={() => setMode(active ? { kind: 'idle' } : { kind: 'pole', length, color })}
                  style={btnStyle(active, color === 'blue' ? '#3b82f6' : '#facc15')}
                >
                  {length === 1 ? 'Full' : 'Half'} · {color}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h3 style={sectionHeader}>Connectors</h3>
          <button onClick={() => setShowCustom((v) => !v)} style={{ ...btnStyle(false, '#a1a1aa'), padding: '2px 8px', fontSize: 11 }}>
            {showCustom ? 'Close' : '+ Custom'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {connectorTypes.map((t) => {
            const active = mode.kind === 'connector' && mode.typeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (sceneEmpty) {
                    placeStartingConnector(t.id);
                    setMode({ kind: 'idle' });
                  } else {
                    setMode(active ? { kind: 'idle' } : { kind: 'connector', typeId: t.id });
                  }
                }}
                style={btnStyle(active, '#6b9fff')}
                title={`Sockets: ${t.sockets.join(', ')}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {showCustom && (
        <CustomConnectorForm
          onAdd={(t) => {
            addCustomConnector(t);
            setShowCustom(false);
          }}
        />
      )}

      <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.5 }}>
        <strong style={{ color: '#3f3f46' }}>How to build:</strong>
        <br />• Pick a pole → click a green socket on a connector.
        <br />• Pick a connector → click a green dot at a pole's free end.
        <br />• Click a piece to select; <kbd style={kbd}>Delete</kbd> to remove.
        <br />• Select a connector, press <kbd style={kbd}>R</kbd> to rotate it
        (<kbd style={kbd}>Shift+R</kbd> reverses). Only rotations that keep existing connections valid are chosen.
      </div>
    </div>
  );
}

function CustomConnectorForm({ onAdd }: { onAdd: (t: ConnectorType) => void }) {
  const [label, setLabel] = useState('');
  const [sockets, setSockets] = useState<Set<Direction>>(new Set());

  const toggle = (d: Direction) => {
    const next = new Set(sockets);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setSockets(next);
  };

  const submit = () => {
    if (!label || sockets.size < 1) return;
    const id = `custom-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;
    onAdd({ id, label, sockets: Array.from(sockets) });
    setLabel('');
    setSockets(new Set());
  };

  return (
    <div style={{ padding: 10, background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Y-shape"
        style={{ padding: 6, background: '#fff', color: '#1f2937', border: '1px solid #d4d4d8', borderRadius: 4 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {ALL_DIRECTIONS.map((d) => (
          <button
            key={d}
            onClick={() => toggle(d)}
            style={btnStyle(sockets.has(d), '#22c55e')}
          >
            {d}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={!label || sockets.size < 1} style={{ ...btnStyle(false, '#22c55e'), opacity: !label || sockets.size < 1 ? 0.4 : 1 }}>
        Add connector
      </button>
    </div>
  );
}

const kbd: React.CSSProperties = {
  background: '#f4f4f5', color: '#3f3f46', padding: '1px 5px', borderRadius: 3,
  border: '1px solid #d4d4d8', fontSize: 10, fontFamily: 'ui-monospace, monospace',
};

const sectionHeader: React.CSSProperties = {
  margin: '0 0 8px', fontSize: 12, letterSpacing: 0.5, color: '#71717a', textTransform: 'uppercase',
};

function btnStyle(active: boolean, accent: string): React.CSSProperties {
  return {
    background: active ? accent : '#ffffff',
    color: active ? '#111' : '#3f3f46',
    border: `1px solid ${active ? accent : '#d4d4d8'}`,
    padding: '6px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'center' as const,
  };
}
