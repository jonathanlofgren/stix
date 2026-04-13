import { useRef } from 'react';
import { useDesignStore } from '../store/designStore';
import type { Design } from '../model/types';

type Props = {
  onOpenInventory: () => void;
};

export function Toolbar({ onOpenInventory }: Props) {
  const exportDesign = useDesignStore((s) => s.exportDesign);
  const importDesign = useDesignStore((s) => s.importDesign);
  const resetDesign = useDesignStore((s) => s.resetDesign);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const undoCount = useDesignStore((s) => s.undoStack.length);
  const redoCount = useDesignStore((s) => s.redoStack.length);

  const fileRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const d = exportDesign();
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const load = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(String(e.target?.result)) as Design;
        if (!Array.isArray(d.pieces)) throw new Error('Invalid design file');
        importDesign(d);
      } catch (err) {
        alert(`Failed to load: ${String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '8px 12px',
      background: '#ffffff', borderTop: '1px solid #e4e4e7', alignItems: 'center',
    }}>
      <button style={toolbarBtn} onClick={() => { if (confirm('Clear the design?')) resetDesign(); }}>New</button>
      <button style={toolbarBtn} onClick={save}>Save</button>
      <button style={toolbarBtn} onClick={() => fileRef.current?.click()}>Load</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) load(f);
          e.target.value = '';
        }}
      />
      <div style={{ width: 1, height: 20, background: '#e4e4e7', margin: '0 6px' }} />
      <button style={{ ...toolbarBtn, opacity: undoCount ? 1 : 0.4 }} onClick={undo} disabled={!undoCount}>Undo</button>
      <button style={{ ...toolbarBtn, opacity: redoCount ? 1 : 0.4 }} onClick={redo} disabled={!redoCount}>Redo</button>
      <div style={{ flex: 1 }} />
      <button style={toolbarBtn} onClick={onOpenInventory}>Inventory</button>
    </div>
  );
}

const toolbarBtn: React.CSSProperties = {
  background: '#f4f4f5',
  color: '#27272a',
  border: '1px solid #d4d4d8',
  padding: '4px 10px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};
