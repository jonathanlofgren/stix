import { useMemo } from 'react';
import { useDesignStore } from '../store/designStore';
import { computeLayers } from '../model/buildPlan';
import { computeBom } from '../model/bom';
import type { Inventory, Piece } from '../model/types';
import { DEFAULT_CONNECTORS } from '../catalog/defaultConnectors';
import { COLOR_HEX, CONNECTOR_SWATCH, sectionHeader, swatch, toolbarBtn } from './theme';

const EMPTY_INVENTORY: Inventory = { connectors: {}, poles: {}, plates: {} };

function rowLabel(r: ReturnType<typeof computeBom>[number]): string {
  if (r.kind === 'pole') return `${r.length === 1 ? 'Full' : 'Half'} pole (${r.color})`;
  if (r.kind === 'plate') return `${r.size === '1x1' ? 'Full' : 'Half'} plate (${r.color})`;
  return r.label;
}

export function BuildPanel() {
  const pieces = useDesignStore((s) => s.pieces);
  const buildLayer = useDesignStore((s) => s.buildLayer);
  const setBuildLayer = useDesignStore((s) => s.setBuildLayer);
  const exitBuild = useDesignStore((s) => s.exitBuild);

  const layers = useMemo(() => computeLayers(pieces), [pieces]);
  const byId = useMemo(() => {
    const m = new Map<string, Piece>();
    for (const p of pieces) m.set(p.id, p);
    return m;
  }, [pieces]);

  const count = layers.length;
  const current = Math.min(buildLayer, Math.max(0, count - 1));
  const layer = layers[current];

  const additions = useMemo(() => {
    if (!layer) return [];
    const layerPieces = layer.pieceIds.map((id) => byId.get(id)).filter((p): p is Piece => !!p);
    return computeBom(layerPieces, DEFAULT_CONNECTORS, EMPTY_INVENTORY);
  }, [layer, byId]);

  const placedSoFar = useMemo(
    () => layers.slice(0, current + 1).reduce((n, l) => n + l.pieceIds.length, 0),
    [layers, current],
  );

  if (count === 0) {
    return (
      <div style={{ padding: 16 }}>
        <h3 style={sectionHeader}>Build mode</h3>
        <p style={{ color: '#71717a', fontSize: 14 }}>
          Nothing to build yet — add some pieces first.
        </p>
        <button style={toolbarBtn} onClick={exitBuild}>Exit build</button>
      </div>
    );
  }

  const atBottom = current <= 0;
  const atTop = current >= count - 1;

  return (
    <div style={{
      height: '100%', minHeight: 0, boxSizing: 'border-box', padding: 16,
      display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 14,
    }}>
      {/* Fixed header + layer stepper */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ ...sectionHeader, margin: 0 }}>Build mode</h3>
          <button style={toolbarBtn} onClick={exitBuild}>Exit</button>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: '#71717a' }}>
          Build from the bottom up. Each step adds one layer onto the one below it.
        </p>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '10px 12px', background: '#ffffff',
          border: '1px solid #e4e4e7', borderRadius: 6,
        }}>
          <button
            style={{ ...toolbarBtn, opacity: atBottom ? 0.4 : 1 }}
            onClick={() => setBuildLayer(current - 1)}
            disabled={atBottom}
            aria-label="Previous layer"
          >
            ◀
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#18181b' }}>
              Layer {current + 1} of {count}
            </div>
            <div style={{ fontSize: 12, color: '#71717a' }}>height y = {layer.y}</div>
          </div>
          <button
            style={{ ...toolbarBtn, opacity: atTop ? 0.4 : 1 }}
            onClick={() => setBuildLayer(current + 1)}
            disabled={atTop}
            aria-label="Next layer"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Scrollable parts list — the only region that scrolls */}
      <div style={{ minHeight: 0, overflow: 'auto' }}>
        <h4 style={{ ...sectionHeader, marginBottom: 6 }}>Add in this layer</h4>
        {additions.length === 0 ? (
          <p style={{ color: '#71717a', fontSize: 14, margin: 0 }}>No new pieces in this layer.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {additions.map((r, idx) => {
                const swatchColor = r.kind === 'connector' ? CONNECTOR_SWATCH : COLOR_HEX[r.color];
                return (
                  <tr key={idx}>
                    <td style={{ padding: '4px 2px' }}>
                      <span style={swatch(swatchColor)} />
                      {rowLabel(r)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>×{r.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pinned footer */}
      <div style={{ fontSize: 12, color: '#71717a', borderTop: '1px solid #e4e4e7', paddingTop: 10 }}>
        {placedSoFar} of {pieces.length} pieces placed · use ◀ ▶ or arrow keys
      </div>
    </div>
  );
}
