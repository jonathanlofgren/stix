import type { Color } from '../model/types';

export const JOINT_RADIUS = 0.075;
export const STUB_RADIUS = 0.04;   // thinner than pole so poles hide it
export const STUB_LENGTH = 0.14;
export const POLE_RADIUS = 0.06;
export const PLATE_THICKNESS = 0.04;
export const SOCKET_RADIUS = 0.08;

export const CONNECTOR_COLOR = '#18181b';
export const SELECTED_COLOR = '#ef4444';
export const HOVER_CONNECTOR = '#3b82f6';
export const HOVER_POLE = '#60a5fa';
export const HOVER_PLATE = '#60a5fa';

export const POLE_COLOR: Record<Color, string> = {
  blue: '#3b82f6',
  yellow: '#facc15',
};

export const PLATE_COLOR: Record<Color, string> = POLE_COLOR;

export const SOCKET_DISABLED = '#666';
export const SOCKET_ENABLED = '#22c55e';
export const SOCKET_HOVER = '#fde047';
