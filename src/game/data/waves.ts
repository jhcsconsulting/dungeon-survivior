export type EnemyKind = 'chaser' | 'shooter' | 'tank';

export interface EnemySpawn {
  kind: EnemyKind;
}

export interface EnemyStats {
  hp: number;
  speed: number;
  contactDamage: number;
  coinsMin: number;
  coinsMax: number;
  radius: number;
}

const BASE_STATS: Record<EnemyKind, EnemyStats> = {
  chaser: { hp: 30, speed: 130, contactDamage: 10, coinsMin: 1, coinsMax: 2, radius: 14 },
  shooter: { hp: 25, speed: 90, contactDamage: 8, coinsMin: 2, coinsMax: 3, radius: 13 },
  tank: { hp: 110, speed: 45, contactDamage: 22, coinsMin: 4, coinsMax: 6, radius: 22 },
};

/** HP/damage multiplier for a given round. */
export function roundScale(round: number): number {
  return 1 + 0.15 * (round - 1);
}

export function statsFor(kind: EnemyKind, round: number): EnemyStats {
  const base = BASE_STATS[kind];
  const scale = roundScale(round);
  return {
    ...base,
    hp: Math.round(base.hp * scale),
    contactDamage: Math.round(base.contactDamage * scale),
    // Slight speed creep so late rounds stay threatening, capped.
    speed: Math.min(base.speed * (1 + 0.03 * (round - 1)), base.speed * 1.4),
  };
}

/** Build the list of enemies to spawn for a round. */
export function buildWave(round: number): EnemySpawn[] {
  const count = 4 + round * 2;
  const spawns: EnemySpawn[] = [];

  // Weights shift toward shooters/tanks as rounds progress.
  const shooterW = round >= 2 ? Math.min(0.2 + 0.05 * (round - 2), 0.4) : 0;
  const tankW = round >= 3 ? Math.min(0.1 + 0.04 * (round - 3), 0.3) : 0;

  for (let i = 0; i < count; i++) {
    const r = Math.random();
    if (r < tankW) spawns.push({ kind: 'tank' });
    else if (r < tankW + shooterW) spawns.push({ kind: 'shooter' });
    else spawns.push({ kind: 'chaser' });
  }

  // Guarantee the new enemy type shows up the round it unlocks.
  if (round === 2 && !spawns.some((s) => s.kind === 'shooter')) {
    spawns[0] = { kind: 'shooter' };
  }
  if (round === 3 && !spawns.some((s) => s.kind === 'tank')) {
    spawns[0] = { kind: 'tank' };
  }

  return spawns;
}
