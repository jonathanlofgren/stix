import { Fragment } from 'react';
import { useDesignStore } from '../store/designStore';
import { ALL_COLORS, ALL_LENGTHS, ALL_PLATE_SIZES, plateKey, poleKey } from '../model/types';
import type { Color, PlateSize, PoleLength } from '../model/types';

type Props = { onClose: () => void };

export function InventoryModal({ onClose }: Props) {
  const connectorTypes = useDesignStore((s) => s.allConnectorTypes)();
  const inventory = useDesignStore((s) => s.inventory);
  const setInventoryConnector = useDesignStore((s) => s.setInventoryConnector);
  const setInventoryPole = useDesignStore((s) => s.setInventoryPole);
  const setInventoryPlate = useDesignStore((s) => s.setInventoryPlate);

  const parseInput = (v: string): number | null => {
    if (v === '') return null;
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) return null;
    return n;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff', padding: 20, borderRadius: 8, minWidth: 420, maxHeight: '80vh',
          overflow: 'auto', border: '1px solid #e4e4e7', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#18181b' }}>Inventory</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: '#71717a', border: 'none', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
        <p style={{ color: '#71717a', fontSize: 12, marginTop: 0 }}>
          How many of each piece do you own? Leave blank for unlimited. Warnings show when a design exceeds inventory.
        </p>

        <h3 style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Poles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 10px', marginBottom: 16 }}>
          {ALL_LENGTHS.flatMap((length: PoleLength) =>
            ALL_COLORS.map((color: Color) => {
              const v = inventory.poles[poleKey(length, color)];
              return (
                <Fragment key={`${length}-${color}`}>
                  <label style={{ fontSize: 12 }}>
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                      background: color === 'blue' ? '#3b82f6' : '#facc15',
                      marginRight: 6, verticalAlign: 'middle',
                    }} />
                    {length === 1 ? 'Full' : 'Half'} pole · {color}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={v ?? ''}
                    onChange={(e) => setInventoryPole(length, color, parseInput(e.target.value))}
                    style={inputStyle}
                  />
                </Fragment>
              );
            }),
          )}
        </div>

        <h3 style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Plates</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 10px', marginBottom: 16 }}>
          {ALL_COLORS.flatMap((color: Color) =>
            ALL_PLATE_SIZES.map((size: PlateSize) => {
              const v = inventory.plates[plateKey(size, color)];
              return (
                <Fragment key={`plate-${size}-${color}`}>
                  <label style={{ fontSize: 12 }}>
                    <span style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                      background: color === 'blue' ? '#3b82f6' : '#facc15',
                      marginRight: 6, verticalAlign: 'middle',
                    }} />
                    {size} plate · {color}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={v ?? ''}
                    onChange={(e) => setInventoryPlate(size, color, parseInput(e.target.value))}
                    style={inputStyle}
                  />
                </Fragment>
              );
            }),
          )}
        </div>

        <h3 style={{ fontSize: 12, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Connectors</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 10px' }}>
          {connectorTypes.map((t) => {
            const v = inventory.connectors[t.id];
            return (
              <Fragment key={t.id}>
                <label style={{ fontSize: 12 }}>
                  <span style={{
                    display: 'inline-block', width: 10, height: 10, borderRadius: 2,
                    background: '#18181b',
                    marginRight: 6, verticalAlign: 'middle',
                  }} />
                  {t.label}
                </label>
                <input
                  type="number"
                  min={0}
                  value={v ?? ''}
                  onChange={(e) => setInventoryConnector(t.id, parseInput(e.target.value))}
                  style={inputStyle}
                />
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: 70, padding: '4px 6px', background: '#ffffff', color: '#1f2937',
  border: '1px solid #d4d4d8', borderRadius: 4, fontSize: 12,
};
