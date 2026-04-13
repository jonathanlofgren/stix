import type { ConnectorType } from '../model/types';

export const DEFAULT_CONNECTORS: ConnectorType[] = [
  { id: 'straight', label: 'Straight', sockets: ['+X', '-X'], builtIn: true },
  { id: 'L', label: 'L (elbow)', sockets: ['+X', '+Y'], builtIn: true },
  { id: 'T', label: 'T', sockets: ['+X', '-X', '+Y'], builtIn: true },
  { id: 'plus', label: 'Plus (+)', sockets: ['+X', '-X', '+Y', '-Y'], builtIn: true },
  { id: 'corner3d', label: '3D corner', sockets: ['+X', '+Y', '+Z'], builtIn: true },
  { id: '5-way', label: '5-way', sockets: ['+X', '-X', '+Y', '-Y', '+Z'], builtIn: true },
  { id: '6-way', label: '6-way', sockets: ['+X', '-X', '+Y', '-Y', '+Z', '-Z'], builtIn: true },
];
