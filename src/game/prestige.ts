import type { PrestigeItem } from './types';

/** Permanent upgrades bought with prestige on the game-over screen; they apply at the start of every run. */
export const PRESTIGE_ITEMS: PrestigeItem[] = [
  { key: 'startVitality', name: 'Vitality Core', desc: '+50 Max HP per level', icon: '❤️', baseCost: 4, costGrowth: 1.6, max: 5 },
  { key: 'startMight', name: 'Mighty Slime', desc: '+15 sword damage per level', icon: '⚔️', baseCost: 4, costGrowth: 1.6, max: 5 },
  { key: 'startSwift', name: 'Swift Slime', desc: '+0.6 move speed per level', icon: '💨', baseCost: 3, costGrowth: 1.6, max: 4 },
  { key: 'startArmor', name: 'Iron Skin', desc: '+4 armor per level', icon: '🛡️', baseCost: 3, costGrowth: 1.6, max: 4 },
  { key: 'startRegen', name: 'Regen Aura', desc: '+1 HP/sec regen per level', icon: '✨', baseCost: 5, costGrowth: 1.6, max: 3 },
  { key: 'startBow', name: 'Born Archer', desc: 'Lv1: bow +15 arrows; +10 arrows/level', icon: '🏹', baseCost: 5, costGrowth: 1.5, max: 5 },
  { key: 'startFlame', name: 'Born Burner', desc: 'Lv1: flamethrower +30 fuel; +20 fuel/level', icon: '🔥', baseCost: 10, costGrowth: 1.5, max: 5 },
];

export const prestigeCost = (item: PrestigeItem, level: number) =>
  Math.round(item.baseCost * Math.pow(item.costGrowth, level));
