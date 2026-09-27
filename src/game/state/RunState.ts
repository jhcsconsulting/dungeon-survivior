export interface RunStats {
  mode: 'dungeon' | 'endless';
  round: number;
  coins: number;
  arrows: number;
  bowOwned: boolean;
  bowDamage: number;
  endlessKills: number;
  endlessNextUpgrade: number;
  hp: number;
  maxHp: number;
  /** Sword damage per hit. */
  damage: number;
  /** Player max movement speed (px/s). */
  moveSpeed: number;
  /** Attacks per second. */
  attackSpeed: number;
  /** Sword reach in pixels (arc radius). */
  swordRange: number;
  /** Multiplier applied to incoming contact/projectile damage. */
  damageTakenMult: number;
  /** Invulnerability window after being hit, ms. */
  iframesMs: number;
  /** Passive radioactive damage dealt around the player. */
  radioactiveDamage: number;
  radioactiveRadius: number;
  /** Number of helper bots orbiting the player. */
  minions: number;
  /** Passive flamethrower settings. */
  flamethrowerDamage: number;
  flamethrowerRange: number;
  flamethrowerInterval: number;
  /** Times each upgrade has been purchased, for price scaling. */
  purchases: Record<string, number>;
}

const DEFAULTS: RunStats = {
  mode: 'dungeon',
  round: 1,
  coins: 0,
  arrows: 0,
  bowOwned: false,
  bowDamage: 32,
  endlessKills: 0,
  endlessNextUpgrade: 10,
  hp: 100,
  maxHp: 100,
  damage: 25,
  moveSpeed: 220,
  attackSpeed: 2,
  swordRange: 52,
  damageTakenMult: 1,
  iframesMs: 700,
  radioactiveDamage: 0,
  radioactiveRadius: 0,
  minions: 0,
  flamethrowerDamage: 0,
  flamethrowerRange: 0,
  flamethrowerInterval: 0,
  purchases: {},
};

/** Mutable state that persists across scenes for the length of one run. */
export const runState: RunStats = { ...DEFAULTS, purchases: {} };

export function resetRun(mode: RunStats['mode'] = 'dungeon'): void {
  Object.assign(runState, DEFAULTS);
  runState.mode = mode;
  if (mode === 'endless') {
    runState.arrows = 15;
    runState.bowOwned = true;
  }
  runState.purchases = {};
}
