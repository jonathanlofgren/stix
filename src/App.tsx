import { useState } from 'react';
import { Viewport } from './scene/Viewport';
import { Palette } from './ui/Palette';
import { BomPanel } from './ui/BomPanel';
import { InventoryModal } from './ui/InventoryModal';
import { Toolbar } from './ui/Toolbar';
import { useDesignStore } from './store/designStore';

export default function App() {
  const [showInventory, setShowInventory] = useState(false);
  const sceneEmpty = useDesignStore((s) => s.pieces.length === 0);

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: 0 }}>
        <div style={{ position: 'relative', minHeight: 0 }}>
          <Viewport />
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(255,255,255,0.85)', padding: '6px 10px',
            borderRadius: 4, fontSize: 12, color: '#52525b',
            pointerEvents: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}>
            Play-structure designer
          </div>
          {sceneEmpty && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
              color: '#71717a', fontSize: 14, textAlign: 'center',
            }}>
              Pick a connector from the right to start →
            </div>
          )}
        </div>
        <div style={{
          borderLeft: '1px solid #e4e4e7',
          background: '#fafafa',
          display: 'grid', gridTemplateRows: 'auto 1fr',
          minHeight: 0, overflow: 'auto',
        }}>
          <Palette />
          <div style={{ borderTop: '1px solid #e4e4e7', overflow: 'auto' }}>
            <BomPanel />
          </div>
        </div>
      </div>
      <Toolbar onOpenInventory={() => setShowInventory(true)} />
      {showInventory && <InventoryModal onClose={() => setShowInventory(false)} />}
    </div>
  );
}
