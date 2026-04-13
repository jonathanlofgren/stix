import type { Inventory } from '../model/types';

export const DEFAULT_INVENTORY: Inventory = {
  poles: {
    '0.5-blue': 5,
    '0.5-yellow': 9,
    '1-blue': 25,
    '1-yellow': 50,
  },
  plates: {
    '1x1-blue': 3,
    '1x0.5-blue': 1,
    '1x1-yellow': 5,
    '1x0.5-yellow': 1,
  },
  connectors: {
    straight: 2,
    L: 8,
    T: 10,
    plus: 1,
    corner3d: 12,
    T3d: 14,
    '5-way': 4,
    '6-way': 0,
  },
};

export function cloneDefaultInventory(): Inventory {
  return {
    poles: { ...DEFAULT_INVENTORY.poles },
    plates: { ...DEFAULT_INVENTORY.plates },
    connectors: { ...DEFAULT_INVENTORY.connectors },
  };
}
