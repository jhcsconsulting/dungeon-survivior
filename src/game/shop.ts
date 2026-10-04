import type { ShopItem } from './types';

/** Items that are always on offer. */
export const BASE_ITEMS: ShopItem[] = [
  { key: 'maxHp', name: 'Vitality', desc: '+25 Max HP & full heal', icon: '❤️', baseCost: 15, growth: 1.5, max: 5 },
  { key: 'damage', name: 'Sharpened Blade', desc: '+12 Sword Damage', icon: '⚔️', baseCost: 18, growth: 1.6, max: 5 },
  { key: 'speed', name: 'Swift Slime', desc: '+0.5 Move Speed', icon: '💨', baseCost: 14, growth: 1.7, max: 4 },
  { key: 'attackSpeed', name: 'Quick Slash', desc: 'Attack faster', icon: '⚡', baseCost: 20, growth: 1.6, max: 5 },
  { key: 'range', name: 'Long Reach', desc: '+12 Attack Range', icon: '📏', baseCost: 16, growth: 1.6, max: 4 },
  { key: 'regen', name: 'Regeneration', desc: '+1 HP/sec regen', icon: '✨', baseCost: 25, growth: 1.8, max: 3 },
  { key: 'shield', name: 'Iron Shield', desc: '+2 Armor (less damage)', icon: '🛡️', baseCost: 20, growth: 1.8, max: 6 },
  { key: 'dashDamage', name: 'Dash Force', desc: '+18 Dash Damage', icon: '💥', baseCost: 20, growth: 1.6, max: 4 },
  { key: 'dashCd', name: 'Quick Dash', desc: '-2s Dash Cooldown', icon: '🌬️', baseCost: 16, growth: 1.7, max: 4 },
  { key: 'shieldCd', name: 'Quick Shield', desc: '-3s Shield Cooldown', icon: '🔮', baseCost: 18, growth: 1.7, max: 4 },
  { key: 'bowDamage', name: 'Stronger Bow', desc: '+15 Arrow Damage', icon: '🎯', baseCost: 22, growth: 1.6, max: 5 },
  { key: 'bowSpeed', name: 'Quick Draw', desc: 'Fire arrows faster', icon: '🌀', baseCost: 18, growth: 1.6, max: 4 },
];

export const BOW: ShopItem = { key: 'bow', name: 'Equip Bow', desc: 'Ranged weapon (aim w/ mouse, F)', icon: '🏹', baseCost: 30, growth: 1, max: 1 };
export const ARROWS: ShopItem = { key: 'arrows', name: 'Arrows x10', desc: '+10 arrow ammo (no limit)', icon: '🪶', baseCost: 8, growth: 1.4, max: Infinity };
export const AURA: ShopItem = { key: 'aura', name: 'Radioactive Essence', desc: 'Damaging aura around you', icon: '☢️', baseCost: 26, growth: 1.7, max: 5 };
export const MINIONS: ShopItem = { key: 'minions', name: 'Slime Minion', desc: '+1 helper bot (auto-attacks)', icon: '🤖', baseCost: 30, growth: 1.8, max: 4 };
export const FLAMETHROWER: ShopItem = { key: 'flamethrower', name: 'Flamethrower', desc: 'Spray fire (hold G, aim w/ mouse)', icon: '🔥', baseCost: 35, growth: 1, max: 1 };
export const FUEL: ShopItem = { key: 'fuel', name: 'Fuel +30', desc: 'Refill flamethrower fuel', icon: '⛽', baseCost: 6, growth: 1.3, max: Infinity };
export const ELECTRIC: ShopItem = { key: 'electric', name: 'Electric Zap', desc: 'Attacks may chain lightning', icon: '⚡', baseCost: 50, growth: 1, max: 1 };
export const ZAP_DAMAGE: ShopItem = { key: 'zapDamage', name: 'Storm Power', desc: '+20 Lightning Damage', icon: '🌩️', baseCost: 40, growth: 1.7, max: 5 };
export const ZAP_RANGE: ShopItem = { key: 'zapRange', name: 'Arc Reach', desc: '+40 Lightning Bridge Range', icon: '🔗', baseCost: 36, growth: 1.7, max: 5 };
export const MULTISHOT: ShopItem = { key: 'multishot', name: 'Multi Shot', desc: 'Bow fires +1 arrow per shot', icon: '🏹', baseCost: 28, growth: 1.8, max: 4 };
export const MINION_DAMAGE: ShopItem = { key: 'minionDamage', name: 'Minion Might', desc: '+6 Slime Minion Damage', icon: '💪', baseCost: 22, growth: 1.7, max: 5 };
export const MINION_SPEED: ShopItem = { key: 'minionSpeed', name: 'Swift Minions', desc: '+0.4 Minion Move Speed', icon: '🌬️', baseCost: 18, growth: 1.7, max: 4 };
export const BURNER: ShopItem = { key: 'burner', name: 'Burner Minion', desc: '+1 fireball minion (burn DoT)', icon: '🔥', baseCost: 45, growth: 1.9, max: 4 };
export const BURNER_DAMAGE: ShopItem = { key: 'burnerDamage', name: 'Inferno Power', desc: '+8 Burner fireball damage', icon: '🌋', baseCost: 30, growth: 1.7, max: 5 };
export const BURNER_BURN: ShopItem = { key: 'burnerBurn', name: 'Wildfire', desc: '+4 burn damage-over-time', icon: '🌶️', baseCost: 26, growth: 1.7, max: 4 };
export const BURNER_RATE: ShopItem = { key: 'burnerRate', name: 'Rapid Combustion', desc: '-0.25s Burner fire cooldown', icon: '💥', baseCost: 24, growth: 1.7, max: 4 };

export const shopCost = (item: ShopItem, level: number) =>
  Math.round(item.baseCost * Math.pow(item.growth, level));

/** Hard caps per upgrade key, enforced when purchasing. */
export const SHOP_MAX_LEVELS: Record<string, number> = {
  maxHp: 5,
  damage: 5,
  speed: 4,
  attackSpeed: 5,
  range: 4,
  regen: 3,
  shield: 6,
  bow: 1,
  bowDamage: 5,
  bowSpeed: 4,
  dashCd: 4,
  shieldCd: 4,
  dashDamage: 4,
  aura: 5,
  minions: 4,
  flamethrower: 1,
  electric: 1,
  zapDamage: 5,
  zapRange: 5,
  multishot: 4,
  minionDamage: 5,
  minionSpeed: 4,
  burner: 4,
  burnerDamage: 5,
  burnerBurn: 4,
  burnerRate: 4,
};

/** Colour of the "absorb" flash shown on the slime when an item is bought. */
export const SHOP_COLORS: Record<string, string> = {
  maxHp: '#f87171',
  damage: '#fb923c',
  speed: '#67e8f9',
  attackSpeed: '#fcd34d',
  range: '#a78bfa',
  regen: '#86efac',
  shield: '#38bdf8',
  bow: '#fcd34d',
  arrows: '#fcd34d',
  bowDamage: '#fb923c',
  bowSpeed: '#fcd34d',
  dashCd: '#67e8f9',
  shieldCd: '#38bdf8',
  dashDamage: '#fb923c',
  aura: '#a3e635',
  minions: '#4ade80',
  flamethrower: '#fb923c',
  fuel: '#f97316',
  electric: '#fde047',
  zapDamage: '#fbbf24',
  zapRange: '#a78bfa',
  multishot: '#fcd34d',
  minionDamage: '#4ade80',
  minionSpeed: '#67e8f9',
  burner: '#fb923c',
  burnerDamage: '#f97316',
  burnerBurn: '#fb923c',
  burnerRate: '#fcd34d',
};

export interface ShopInventory {
  hasBow: boolean;
  hasFlame: boolean;
  hasElectric: boolean;
  levels: Record<string, number>;
}

/** The list of items shown in the shop, which unlocks follow-up upgrades as you buy. */
export function buildShopList(inv: ShopInventory): ShopItem[] {
  const lvl = (k: string) => inv.levels[k] || 0;
  const items: ShopItem[] = [...BASE_ITEMS, AURA, MINIONS];
  if (lvl('minions') > 0) items.push(MINION_DAMAGE, MINION_SPEED);
  items.push(BURNER);
  if (lvl('burner') > 0) items.push(BURNER_DAMAGE, BURNER_BURN, BURNER_RATE);
  if (inv.hasBow) items.push(ARROWS, MULTISHOT);
  else items.push(BOW);
  if (inv.hasFlame) items.push(FUEL);
  else items.push(FLAMETHROWER);
  if (inv.hasElectric) items.push(ZAP_DAMAGE, ZAP_RANGE);
  else items.push(ELECTRIC);
  return items;
}
