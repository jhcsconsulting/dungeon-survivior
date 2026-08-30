export interface RunStats {
  round: number;
  coins: number;
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
  /** Times each upgrade has been purchased, for price scaling. */
  purchases: Record<string, number>;
}

const DEFAULTS: RunStats = {
  round: 1,
  coins: 0,
  hp: 100,
  maxHp: 100,
  damage: 25,
  moveSpeed: 220,
  attackSpeed: 2,
  swordRange: 52,
  damageTakenMult: 1,
  iframesMs: 700,
  purchases: {},
};

/** Mutable state that persists across scenes for the length of one run. */
export const runState: RunStats = { ...DEFAULTS, purchases: {} };

export function resetRun(): void {
  Object.assign(runState, DEFAULTS);
  runState.purchases = {};
}
