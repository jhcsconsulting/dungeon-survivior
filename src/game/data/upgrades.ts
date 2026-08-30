import { RunStats } from '../state/RunState';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  /** Price grows by this factor per purchase. */
  priceGrowth: number;
  apply: (s: RunStats) => void;
}

export const UPGRADES: Upgrade[] = [
  {
    id: 'heart-gel',
    name: 'Heart Gel',
    description: '+25 max HP and heal 25',
    basePrice: 8,
    priceGrowth: 1.5,
    apply: (s) => {
      s.maxHp += 25;
      s.hp = Math.min(s.maxHp, s.hp + 25);
    },
  },
  {
    id: 'sharper-blade',
    name: 'Sharper Blade',
    description: '+8 sword damage',
    basePrice: 10,
    priceGrowth: 1.5,
    apply: (s) => {
      s.damage += 8;
    },
  },
  {
    id: 'quicksilver',
    name: 'Quicksilver',
    description: '+12% move speed',
    basePrice: 8,
    priceGrowth: 1.45,
    apply: (s) => {
      s.moveSpeed = Math.round(s.moveSpeed * 1.12);
    },
  },
  {
    id: 'longer-reach',
    name: 'Longer Reach',
    description: '+10 sword range',
    basePrice: 7,
    priceGrowth: 1.4,
    apply: (s) => {
      s.swordRange += 10;
    },
  },
  {
    id: 'faster-swings',
    name: 'Faster Swings',
    description: '+20% attack speed',
    basePrice: 10,
    priceGrowth: 1.5,
    apply: (s) => {
      s.attackSpeed *= 1.2;
    },
  },
  {
    id: 'thick-membrane',
    name: 'Thick Membrane',
    description: '-10% damage taken, +100ms i-frames',
    basePrice: 12,
    priceGrowth: 1.6,
    apply: (s) => {
      s.damageTakenMult *= 0.9;
      s.iframesMs += 100;
    },
  },
];

export function priceFor(upgrade: Upgrade, purchases: Record<string, number>): number {
  const n = purchases[upgrade.id] ?? 0;
  return Math.round(upgrade.basePrice * Math.pow(upgrade.priceGrowth, n));
}
