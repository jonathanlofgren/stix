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

// Build-mode appearance for a piece, by its layer relative to the current step.
//  - 'built':   placed in an earlier (lower) layer — shown solid, for context.
//  - 'current': belongs to the layer being assembled now — highlighted.
//  - 'ghost':   in a higher layer not yet reached — faintly previewed.
export type BuildAppearance = 'built' | 'current' | 'ghost';

export const BUILD_GHOST_COLOR = '#a1a1aa';
export const BUILD_GHOST_OPACITY = 0.12;

// The current layer keeps its true colors and is distinguished by a discrete
// outline (drawn separately), not a surface tint. drei's <Outlines> measures
// thickness in screen pixels (constant width regardless of zoom).
export const BUILD_OUTLINE_COLOR = '#16a34a';
export const BUILD_OUTLINE_THICKNESS = 8;

// Material props applied to a piece's mesh in build mode, given its base color.
// 'built' and 'current' share the same real-color material; 'current' adds an
// outline at the call site.
export function buildMaterial(
  appearance: BuildAppearance,
  baseColor: string,
  baseOpacity = 1,
): {
  color: string;
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
} {
  if (appearance === 'ghost') {
    return {
      color: BUILD_GHOST_COLOR,
      transparent: true,
      opacity: BUILD_GHOST_OPACITY,
      depthWrite: false,
    };
  }
  // built and current
  return {
    color: baseColor,
    transparent: baseOpacity < 1,
    opacity: baseOpacity,
    depthWrite: true,
  };
}
