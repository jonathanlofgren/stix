import { useMemo } from 'react';
import { useDesignStore } from '../store/designStore';
import { computeBom } from '../model/bom';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';
import { COLOR_HEX, CONNECTOR_SWATCH, sectionHeader, swatch } from './theme';

export function BomPanel() {
  const pieces = useDesignStore((s) => s.pieces);
  const inventory = useDesignStore((s) => s.inventory);

  const rows = useMemo(
    () => computeBom(pieces, DEFAULT_CONNECTORS, inventory),
    [pieces, inventory],
  );

  if (rows.length === 0) {
    return <div style={{ padding: 12, color: '#71717a', fontSize: 14 }}>No pieces yet.</div>;
  }

  return (
    <div style={{ padding: 12 }}>
      <h3 style={sectionHeader}>Bill of materials</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ color: '#71717a', borderBottom: '1px solid #e4e4e7' }}>
            <th style={{ textAlign: 'left', padding: '4px 2px' }}>Piece</th>
            <th style={{ textAlign: 'right', padding: '4px 2px' }}>Need</th>
            <th style={{ textAlign: 'right', padding: '4px 2px' }}>Own</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const over = r.over > 0;
            const label =
              r.kind === 'pole'
                ? `${r.length === 1 ? 'Full' : 'Half'} pole`
                : r.kind === 'plate'
                  ? `${r.size === '1x1' ? 'Full' : 'Half'} plate`
                  : r.label;
            const swatchColor = r.kind === 'connector' ? CONNECTOR_SWATCH : COLOR_HEX[r.color];
            return (
              <tr key={idx} style={{ background: over ? '#fee2e2' : 'transparent', color: over ? '#b91c1c' : '#27272a' }}>
                <td style={{ padding: '3px 2px' }}>
                  <span style={swatch(swatchColor)} />
                  {label}
                </td>
                <td style={{ textAlign: 'right', padding: '3px 2px' }}>{r.count}</td>
                <td style={{ textAlign: 'right', padding: '3px 2px', color: over ? '#b91c1c' : '#71717a' }}>
                  {r.owned == null ? '—' : r.owned}
                  {over && <span style={{ color: '#dc2626', marginLeft: 4 }}>(+{r.over})</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
