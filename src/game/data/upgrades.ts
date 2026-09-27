import { RunStats } from '../state/RunState';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  /** Price grows by this factor per purchase. */
  priceGrowth: number;
  maxPurchases?: number;
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
    id: 'iron-shield',
    name: 'Iron Shield',
    description: '-10% damage taken, +100ms i-frames (max 6)',
    basePrice: 12,
    priceGrowth: 1.6,
    maxPurchases: 6,
    apply: (s) => {
      s.damageTakenMult *= 0.9;
      s.iframesMs += 100;
    },
  },
  {
    id: 'radioactive-essence',
    name: 'Radioactive Essence',
    description: 'Damage enemies in a toxic 78px aura',
    basePrice: 14,
    priceGrowth: 1.55,
    apply: (s) => {
      s.radioactiveDamage += 10;
      s.radioactiveRadius = Math.max(s.radioactiveRadius, 78) + 4;
    },
  },
  {
    id: 'slime-minions',
    name: 'Slime Minions',
    description: 'Deploy a bot that fires at nearby enemies',
    basePrice: 18,
    priceGrowth: 1.7,
    apply: (s) => {
      s.minions += 1;
    },
  },
  {
    id: 'flamethrower',
    name: 'Flamethrower',
    description: 'Breathe fire in your facing direction',
    basePrice: 16,
    priceGrowth: 1.6,
    apply: (s) => {
      s.flamethrowerDamage += 16;
      s.flamethrowerRange = Math.max(s.flamethrowerRange, 142) + 8;
      s.flamethrowerInterval = 520;
    },
  },
  {
    id: 'napalm-core',
    name: 'Napalm Core',
    description: '+12 flamethrower damage',
    basePrice: 14,
    priceGrowth: 1.5,
    apply: (s) => {
      s.flamethrowerDamage += 12;
    },
  },
  {
    id: 'wide-nozzle',
    name: 'Wide Nozzle',
    description: '+24 flamethrower range',
    basePrice: 13,
    priceGrowth: 1.5,
    apply: (s) => {
      s.flamethrowerRange += 24;
    },
  },
  {
    id: 'rapid-ignition',
    name: 'Rapid Ignition',
    description: 'Flamethrower fires 90ms faster',
    basePrice: 15,
    priceGrowth: 1.55,
    apply: (s) => {
      s.flamethrowerInterval = Math.max(220, s.flamethrowerInterval - 90);
    },
  },
  {
    id: 'bow',
    name: 'Hunter Bow',
    description: 'Unlock aimed arrows with infinite range',
    basePrice: 20,
    priceGrowth: 1.8,
    maxPurchases: 1,
    apply: (s) => {
      s.bowOwned = true;
    },
  },
  {
    id: 'arrow-bundle',
    name: 'Arrow Bundle',
    description: '+8 arrows (not sold in Endless World)',
    basePrice: 6,
    priceGrowth: 1.35,
    apply: (s) => {
      s.arrows += 8;
    },
  },
];

export function priceFor(upgrade: Upgrade, purchases: Record<string, number>): number {
  const n = purchases[upgrade.id] ?? 0;
  return Math.round(upgrade.basePrice * Math.pow(upgrade.priceGrowth, n));
}
