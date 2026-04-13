import { useDesignStore } from '../store/designStore';
import { computeBom } from '../model/bom';

export function BomPanel() {
  const pieces = useDesignStore((s) => s.pieces);
  const connectorTypes = useDesignStore((s) => s.allConnectorTypes)();
  const inventory = useDesignStore((s) => s.inventory);

  const rows = computeBom(pieces, connectorTypes, inventory);

  if (rows.length === 0) {
    return <div style={{ padding: 12, color: '#71717a', fontSize: 12 }}>No pieces yet.</div>;
  }

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 12, letterSpacing: 0.5, color: '#71717a', textTransform: 'uppercase' }}>
        Bill of materials
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
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
                ? `${r.color === 'blue' ? 'Blue' : 'Yellow'} · ${r.length === 1 ? '1L' : '0.5L'} pole`
                : r.kind === 'plate'
                  ? `${r.color === 'blue' ? 'Blue' : 'Yellow'} · ${r.size} plate`
                  : r.label;
            const showSwatch = r.kind === 'pole' || r.kind === 'plate';
            const swatchColor = showSwatch ? (r.color === 'blue' ? '#3b82f6' : '#facc15') : null;
            return (
              <tr key={idx} style={{ background: over ? '#fee2e2' : 'transparent', color: over ? '#b91c1c' : '#27272a' }}>
                <td style={{ padding: '3px 2px' }}>
                  {swatchColor && (
                    <span style={{
                      display: 'inline-block',
                      width: 10, height: 10, borderRadius: 2,
                      background: swatchColor,
                      marginRight: 6, verticalAlign: 'middle',
                    }} />
                  )}
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
