import { Fragment } from 'react';
import { useDesignStore } from '../store/designStore';
import { ALL_COLORS, ALL_PLATE_SIZES, plateKey, poleKey } from '../model/types';
import type { Color, PlateSize, PoleLength } from '../model/types';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';
import { COLOR_HEX, CONNECTOR_SWATCH, inputStyle, sectionHeader, swatch } from './theme';

type Props = { onClose: () => void };

export function InventoryModal({ onClose }: Props) {
  const connectorTypes = DEFAULT_CONNECTORS;
  const inventory = useDesignStore((s) => s.inventory);
  const setInventoryConnector = useDesignStore((s) => s.setInventoryConnector);
  const setInventoryPole = useDesignStore((s) => s.setInventoryPole);
  const setInventoryPlate = useDesignStore((s) => s.setInventoryPlate);
  const resetInventory = useDesignStore((s) => s.resetInventory);
  const clearInventory = useDesignStore((s) => s.clearInventory);

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
          background: '#ffffff', padding: 20, borderRadius: 8, minWidth: 460, maxHeight: '80vh',
          overflow: 'auto', border: '1px solid #e4e4e7', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#18181b' }}>Inventory</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: '#71717a', border: 'none', cursor: 'pointer', fontSize: 24 }}>×</button>
        </div>
        <p style={{ color: '#71717a', fontSize: 14, marginTop: 0 }}>
          How many of each piece do you own? Leave blank for unlimited. Warnings show when a design exceeds inventory.
        </p>
        <div style={{ marginBottom: 12, display: 'flex', gap: 6 }}>
          <button
            onClick={() => {
              if (confirm('Reset inventory to default?')) resetInventory();
            }}
            style={{
              background: '#ffffff', color: '#3f3f46',
              border: '1px solid #d4d4d8', borderRadius: 4,
              padding: '6px 12px', fontSize: 14, cursor: 'pointer',
            }}
          >
            Reset to default
          </button>
          <button
            onClick={() => {
              if (confirm('Set all pieces to unlimited?')) clearInventory();
            }}
            style={{
              background: '#ffffff', color: '#3f3f46',
              border: '1px solid #d4d4d8', borderRadius: 4,
              padding: '6px 12px', fontSize: 14, cursor: 'pointer',
            }}
          >
            Unlimited (clear all)
          </button>
        </div>

        <h3 style={{ ...sectionHeader, marginBottom: 6 }}>Poles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 10px', marginBottom: 16 }}>
          {([1, 0.5] as PoleLength[]).flatMap((length) =>
            ALL_COLORS.map((color: Color) => {
              const v = inventory.poles[poleKey(length, color)];
              return (
                <Fragment key={`${length}-${color}`}>
                  <label style={{ fontSize: 14 }}>
                    <span style={swatch(COLOR_HEX[color])} />
                    {length === 1 ? 'Full' : 'Half'} pole
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

        <h3 style={{ ...sectionHeader, marginBottom: 6 }}>Plates</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 10px', marginBottom: 16 }}>
          {ALL_PLATE_SIZES.flatMap((size: PlateSize) =>
            ALL_COLORS.map((color: Color) => {
              const v = inventory.plates[plateKey(size, color)];
              return (
                <Fragment key={`plate-${size}-${color}`}>
                  <label style={{ fontSize: 14 }}>
                    <span style={swatch(COLOR_HEX[color])} />
                    {size === '1x1' ? 'Full' : 'Half'} plate
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

        <h3 style={{ ...sectionHeader, marginBottom: 6 }}>Connectors</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 10px' }}>
          {connectorTypes.map((t) => {
            const v = inventory.connectors[t.id];
            return (
              <Fragment key={t.id}>
                <label style={{ fontSize: 14 }}>
                  <span style={swatch(CONNECTOR_SWATCH)} />
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
