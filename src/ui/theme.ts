import type { CSSProperties } from 'react';
import type { Color } from '../model/types';

export const COLOR_HEX: Record<Color, string> = {
  blue: '#3b82f6',
  yellow: '#facc15',
};

// Foreground color for labels drawn on top of a swatch background.
export const COLOR_FG: Record<Color, string> = {
  blue: '#ffffff',
  yellow: '#1f2937',
};

export const CONNECTOR_SWATCH = '#18181b';

export const sectionHeader: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 12,
  letterSpacing: 0.5,
  color: '#71717a',
  textTransform: 'uppercase',
};

export const kbd: CSSProperties = {
  background: '#f4f4f5',
  color: '#3f3f46',
  padding: '1px 5px',
  borderRadius: 3,
  border: '1px solid #d4d4d8',
  fontSize: 10,
  fontFamily: 'ui-monospace, monospace',
};

export const toolbarBtn: CSSProperties = {
  background: '#f4f4f5',
  color: '#27272a',
  border: '1px solid #d4d4d8',
  padding: '4px 10px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};

export const inputStyle: CSSProperties = {
  width: 70,
  padding: '4px 6px',
  background: '#ffffff',
  color: '#1f2937',
  border: '1px solid #d4d4d8',
  borderRadius: 4,
  fontSize: 12,
};

export function connectorBtn(active: boolean, dimmed = false, accent = '#6b9fff'): CSSProperties {
  return {
    background: active ? accent : '#ffffff',
    color: active ? '#111' : '#3f3f46',
    border: `1px solid ${active ? accent : '#d4d4d8'}`,
    padding: '6px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'center',
    position: 'relative',
    opacity: dimmed ? 0.45 : 1,
  };
}

export function paletteSwatchBtn(color: Color, active: boolean, dimmed = false): CSSProperties {
  return {
    background: COLOR_HEX[color],
    color: COLOR_FG[color],
    border: `2px solid ${active ? '#18181b' : 'transparent'}`,
    boxShadow: active ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
    padding: '4px 6px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'center',
    position: 'relative',
    opacity: dimmed ? 0.45 : 1,
  };
}

export function remainingBadge(over: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 9,
    background: over ? '#dc2626' : '#ffffff',
    color: over ? '#ffffff' : '#27272a',
    border: `1px solid ${over ? '#dc2626' : '#d4d4d8'}`,
    fontSize: 10,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
    pointerEvents: 'none',
    boxSizing: 'border-box',
  };
}

export function swatch(color: string, size = 10): CSSProperties {
  return {
    display: 'inline-block',
    width: size,
    height: size,
    borderRadius: 2,
    background: color,
    marginRight: 6,
    verticalAlign: 'middle',
  };
}
