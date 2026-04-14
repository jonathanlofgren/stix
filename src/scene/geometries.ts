import * as THREE from 'three';
import {
  JOINT_RADIUS, POLE_RADIUS, SOCKET_RADIUS, STUB_LENGTH, STUB_RADIUS,
} from './constants';
import type { PoleLength } from '../model/types';

export const jointGeometry = new THREE.SphereGeometry(JOINT_RADIUS, 16, 12);
export const stubGeometry = new THREE.CylinderGeometry(STUB_RADIUS, STUB_RADIUS, STUB_LENGTH, 12);
export const socketGeometry = new THREE.SphereGeometry(SOCKET_RADIUS, 16, 12);

const poleGeometries: Record<string, THREE.CylinderGeometry> = {};
export function poleGeometry(length: PoleLength): THREE.CylinderGeometry {
  const key = String(length);
  if (!poleGeometries[key]) {
    poleGeometries[key] = new THREE.CylinderGeometry(POLE_RADIUS, POLE_RADIUS, length, 16);
  }
  return poleGeometries[key];
}
