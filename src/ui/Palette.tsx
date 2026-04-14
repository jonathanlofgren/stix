import { useDesignStore } from '../store/designStore';
import { ALL_COLORS, ALL_PLATE_SIZES } from '../model/types';
import type { Color, PlateSize, PoleLength } from '../model/types';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';
import { connectorBtn, kbd, paletteSwatchBtn, sectionHeader } from './theme';

export function Palette() {
  const mode = useDesignStore((s) => s.mode);
  const setMode = useDesignStore((s) => s.setMode);
  const connectorTypes = DEFAULT_CONNECTORS;
  const placeStartingConnector = useDesignStore((s) => s.placeStartingConnector);
  const sceneEmpty = useDesignStore((s) => s.pieces.length === 0);
  const plateOpacity = useDesignStore((s) => s.plateOpacity);
  const setPlateOpacity = useDesignStore((s) => s.setPlateOpacity);

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div>
        <h3 style={sectionHeader}>Poles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ALL_COLORS.flatMap((color: Color) =>
            ([1, 0.5] as PoleLength[]).map((length) => {
              const active = mode.kind === 'pole' && mode.length === length && mode.color === color;
              const label = `${color === 'blue' ? 'Blue' : 'Yellow'} · ${length === 1 ? '1L' : '0.5L'}`;
              return (
                <button
                  key={`${length}-${color}`}
                  onClick={() => setMode(active ? { kind: 'idle' } : { kind: 'pole', length, color })}
                  style={paletteSwatchBtn(color, active)}
                >
                  {label}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <div>
        <h3 style={sectionHeader}>Plates</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {ALL_COLORS.flatMap((color: Color) =>
            ALL_PLATE_SIZES.map((size: PlateSize) => {
              const active = mode.kind === 'plate' && mode.size === size && mode.color === color;
              const label = `${color === 'blue' ? 'Blue' : 'Yellow'} · ${size}`;
              return (
                <button
                  key={`plate-${size}-${color}`}
                  onClick={() => setMode(active ? { kind: 'idle' } : { kind: 'plate', size, color })}
                  style={paletteSwatchBtn(color, active)}
                >
                  {label}
                </button>
              );
            }),
          )}
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#52525b' }}>
          <span>See-through</span>
          <button
            role="switch"
            aria-checked={plateOpacity < 1}
            onClick={() => setPlateOpacity(plateOpacity < 1 ? 1 : 0.5)}
            style={{
              marginLeft: 'auto',
              width: 32, height: 18, borderRadius: 9,
              border: '1px solid #d4d4d8',
              background: plateOpacity < 1 ? '#3b82f6' : '#e4e4e7',
              position: 'relative', cursor: 'pointer', padding: 0,
              transition: 'background 0.15s',
            }}
          >
            <span style={{
              position: 'absolute', top: 1, left: plateOpacity < 1 ? 15 : 1,
              width: 14, height: 14, borderRadius: '50%',
              background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              transition: 'left 0.15s',
            }} />
          </button>
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
                style={connectorBtn(active)}
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
        <br />• Pick a plate → ghosts appear on every valid pole rectangle; click one.
        <br />• Click a piece to select; <kbd style={kbd}>Delete</kbd> to remove.
        <br />• Select a connector, press <kbd style={kbd}>R</kbd> to rotate it
        (<kbd style={kbd}>Shift+R</kbd> reverses). Only rotations that keep existing connections valid are chosen.
      </div>
    </div>
  );
}
