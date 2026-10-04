import { ENEMY_SIZE, HEIGHT, PLAYER_SIZE, TANK_SIZE, WIDTH } from './constants';
import type { Enemy, EnemyType, Minion, Player, Unlocks } from './types';

/** Creates the player with permanent prestige unlocks applied. */
export function createPlayer(unlocks: Unlocks): Player {
  const lvl = (k: string) => (unlocks && +unlocks[k]) || 0;
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    hp: 100 + lvl('startVitality') * 50,
    maxHp: 100 + lvl('startVitality') * 50,
    speed: 3 + lvl('startSwift') * 0.6,
    size: PLAYER_SIZE,
    facing: { x: 1, y: 0 },
    attackCooldown: 0,
    attackTime: 0,
    invuln: 0,
    damage: 25 + lvl('startMight') * 15,
    attackSpeed: 0.4,
    attackRange: 55,
    regen: lvl('startRegen'),
    bow: lvl('startBow') > 0,
    arrows: lvl('startBow') > 0 ? 15 + (lvl('startBow') - 1) * 10 : 0,
    bowDamage: 20,
    bowSpeed: 0.5,
    bowCooldown: 0,
    bowDrawTime: 0,
    armor: lvl('startArmor') * 4,
    dashCooldown: 0,
    dashTime: 0,
    dashDir: { x: 1, y: 0 },
    dashDamage: 30,
    dashCdMax: 15,
    shieldCooldown: 0,
    shieldTime: 0,
    shieldDir: { x: 1, y: 0 },
    shieldCdMax: 20,
    speedBoostTime: 0,
    damageBoostTime: 0,
    auraLevel: 0,
    auraRadius: 0,
    auraDps: 0,
    flamethrower: lvl('startFlame') > 0,
    fuel: lvl('startFlame') > 0 ? 30 + (lvl('startFlame') - 1) * 20 : 0,
    flameDamage: 7,
    flameRange: 95,
    flameActive: false,
    electric: false,
    zapDamage: 25,
    zapRange: 110,
    zapChance: 0.35,
    zapChains: 3,
    multishot: 0,
    minionDamage: 8,
    minionSpeed: 2.6,
    burnerDamage: 10,
    burnerBurn: 6,
    burnerCd: 1.5,
  };
}

/** Enemy roster unlocks with the round number. */
export function pickEnemyType(round: number): EnemyType {
  const r = Math.random();
  if (round >= 4 && r < 0.15) return 'warp';
  if (round >= 3 && r < 0.35) return 'tank';
  if (round >= 2 && r < 0.6) return 'ranged';
  return 'melee';
}

/** Creates an enemy just outside a random edge of the arena. */
export function createEnemy(type: EnemyType, round: number): Enemy {
  const edge = Math.floor(Math.random() * 4);
  let x: number;
  let y: number;
  if (edge === 0) {
    x = Math.random() * WIDTH;
    y = -30;
  } else if (edge === 1) {
    x = WIDTH + 30;
    y = Math.random() * HEIGHT;
  } else if (edge === 2) {
    x = Math.random() * WIDTH;
    y = HEIGHT + 30;
  } else {
    x = -30;
    y = Math.random() * HEIGHT;
  }

  const base: Enemy = {
    x,
    y,
    type,
    attackCooldown: 0,
    hitFlash: 0,
    wobble: Math.random() * Math.PI * 2,
    size: ENEMY_SIZE,
    hp: 0,
    maxHp: 0,
    speed: 0,
    damage: 0,
    coinValue: 0,
    contactCooldown: 0,
    preferredDist: 0,
    shootCooldown: 0,
    teleportCd: 0,
    fadeOut: 0,
    fadeIn: 0,
    heal: 0,
    burstPhase: 0,
  };

  switch (type) {
    case 'melee':
      return {
        ...base,
        hp: 40 + round * 10,
        maxHp: 40 + round * 10,
        speed: 1.4 + round * 0.06,
        damage: 8 + round,
        coinValue: 3 + Math.floor(round * 0.6),
      };
    case 'ranged':
      return {
        ...base,
        hp: 28 + round * 8,
        maxHp: 28 + round * 8,
        speed: 0.9 + round * 0.04,
        damage: 6 + round * 0.8,
        coinValue: 5 + Math.floor(round * 0.6),
        preferredDist: 220,
        shootCooldown: 1.4,
      };
    case 'warp':
      return {
        ...base,
        hp: 18 + round * 4,
        maxHp: 18 + round * 4,
        speed: 1.6 + round * 0.05,
        damage: 4 + round * 0.5,
        coinValue: 6 + Math.floor(round * 0.6),
        teleportCd: 2.2,
      };
    case 'tank':
      return {
        ...base,
        size: TANK_SIZE,
        hp: 120 + round * 30,
        maxHp: 120 + round * 30,
        speed: 0.55 + round * 0.03,
        damage: 14 + round * 1.5,
        coinValue: 12 + Math.floor(round * 1.5),
      };
    case 'boss':
      return {
        ...base,
        size: 72 + round,
        hp: 400 + round * 80,
        maxHp: 400 + round * 80,
        speed: 1.1 + round * 0.03,
        damage: 18 + round * 1.5,
        coinValue: 60 + round * 8,
        heal: 2 + round * 0.4,
        shootCooldown: 1,
      };
  }
}

export function createSlimeMinion(damage: number, speed: number): Minion {
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    size: 18,
    speed,
    damage,
    cooldown: 0,
    cdMax: 0.6,
    wobble: Math.random() * Math.PI * 2,
    orbit: Math.random() * Math.PI * 2,
    type: 'slime',
    burnDps: 0,
    burnTime: 0,
    range: 0,
  };
}

export function createBurnerMinion(damage: number, burnDps: number, cdMax: number): Minion {
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    size: 20,
    speed: 1.8,
    damage,
    cooldown: 0,
    cdMax,
    wobble: Math.random() * Math.PI * 2,
    orbit: Math.random() * Math.PI * 2,
    type: 'burner',
    burnDps,
    burnTime: 3,
    range: 280,
  };
}
