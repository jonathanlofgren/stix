import { useDesignStore } from '../store/designStore';
import { ALL_COLORS } from '../model/types';
import type { Color, PoleLength } from '../model/types';

export function Palette() {
  const mode = useDesignStore((s) => s.mode);
  const setMode = useDesignStore((s) => s.setMode);
  const connectorTypes = useDesignStore((s) => s.allConnectorTypes)();
  const placeStartingConnector = useDesignStore((s) => s.placeStartingConnector);
  const sceneEmpty = useDesignStore((s) => s.pieces.length === 0);

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={sectionHeader}>Poles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ALL_COLORS.flatMap((color: Color) =>
            ([1, 0.5] as PoleLength[]).map((length) => {
              const active = mode.kind === 'pole' && mode.length === length && mode.color === color;
              const bg = color === 'blue'
                ? (active ? '#1d4ed8' : '#3b82f6')
                : (active ? '#ca8a04' : '#facc15');
              const fg = color === 'blue' ? '#ffffff' : '#1f2937';
              const label = `${color === 'blue' ? 'Blue' : 'Yellow'} · ${length === 1 ? '1L' : '0.5L'}`;
              return (
                <button
                  key={`${length}-${color}`}
                  onClick={() => setMode(active ? { kind: 'idle' } : { kind: 'pole', length, color })}
                  style={{
                    background: bg,
                    color: fg,
                    border: 'none',
                    boxShadow: active ? 'inset 0 2px 4px rgba(0,0,0,0.25)' : '0 1px 2px rgba(0,0,0,0.08)',
                    padding: '6px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                >
                  {label}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <div>
        <h3 style={sectionHeader}>Connectors</h3>
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
