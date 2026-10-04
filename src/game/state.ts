import { HEIGHT, WIDTH } from './constants';
import { createEnemy, createPlayer, pickEnemyType } from './entities';
import type { GameMode, GameState, Hud, Unlocks } from './types';

export function createGameState(mode: GameMode, unlocks: Unlocks): GameState {
  const state: GameState = {
    player: createPlayer(unlocks),
    enemies: [],
    projectiles: [],
    arrows: [],
    obstacles: [],
    minions: [],
    minionShots: [],
    coins: 0,
    goldEarned: 0,
    kills: 0,
    score: 0,
    round: 1,
    particles: [],
    powerups: [],
    damageNumbers: [],
    lightning: [],
    slimeBob: 0,
    levels: {},
    dashId: 0,
    animTime: 0,
    frameIndex: 0,
    anim: 'idle',
    mode,
    survivalTime: 0,
    spawnTimer: 1,
    xp: 0,
    xpNeeded: 100,
    level: 1,
    pendingUpgrades: null,
    transition: null,
    absorb: null,
    clearDelay: null,
    prestigeAwarded: false,
    statsAwarded: false,
  };
  if (mode === 'endless') {
    spawnEndlessEnemy(state, 1);
    spawnEndlessEnemy(state, 1);
  } else {
    setupRound(state, 1);
  }
  return state;
}

/** Classic mode: reset the arena, scatter obstacles and spawn the round's wave (plus a boss every 5 rounds). */
export function setupRound(state: GameState, round: number) {
  state.enemies = [];
  state.projectiles = [];
  state.powerups = [];
  state.minionShots = [];
  state.transition = null;
  state.absorb = null;
  state.clearDelay = null;
  state.round = round;
  state.obstacles = [];

  const obstacleCount = 3 + Math.floor(round / 3);
  for (let i = 0; i < obstacleCount; i++) {
    const isLog = Math.random() < 0.55;
    const w = isLog ? 72 + Math.random() * 48 : 40 + Math.random() * 30;
    const h = isLog ? 26 + Math.random() * 12 : 40 + Math.random() * 30;
    const x = 60 + Math.random() * (WIDTH - 140 - w);
    const y = 60 + Math.random() * (HEIGHT - 140 - h);
    // keep the spawn point clear and leave the top-right corner open
    if (Math.hypot(x + w / 2 - WIDTH / 2, y + h / 2 - HEIGHT / 2) < 110) continue;
    if (x + w > WIDTH - 110 && y < 150) continue;
    state.obstacles.push({ x, y, w, h, kind: isLog ? 'log' : 'stone' });
  }

  const enemyCount = 3 + Math.floor(round * 1.5);
  for (let i = 0; i < enemyCount; i++) {
    state.enemies.push(createEnemy(pickEnemyType(round), round));
  }
  if (round % 5 === 0) state.enemies.push(createEnemy('boss', round));
}

/** Endless mode: spawn one enemy on a ring just outside the view around the player. */
export function spawnEndlessEnemy(state: GameState, difficulty: number) {
  const p = state.player;
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.max(WIDTH, HEIGHT) / 2 + 40 + Math.random() * 60;
  const enemy = createEnemy(pickEnemyType(difficulty), difficulty);
  enemy.x = p.x + Math.cos(angle) * dist;
  enemy.y = p.y + Math.sin(angle) * dist;
  state.enemies.push(enemy);
}

export function hudFromState(state: GameState): Hud {
  const p = state.player;
  const boss = state.enemies.find((e) => e.type === 'boss');
  return {
    hp: Math.max(0, Math.ceil(p.hp)),
    maxHp: p.maxHp,
    coins: state.coins,
    score: state.score,
    round: state.round,
    enemiesLeft: state.enemies.length,
    arrows: p.arrows,
    hasBow: p.bow,
    armor: p.armor,
    levels: { ...state.levels },
    dashCd: Math.ceil(p.dashCooldown),
    shieldCd: Math.ceil(p.shieldCooldown),
    speedBoost: Math.ceil(p.speedBoostTime),
    damageBoost: Math.ceil(p.damageBoostTime),
    aura: p.auraLevel,
    hasFlame: p.flamethrower,
    hasElectric: p.electric,
    fuel: Math.ceil(p.fuel),
    minions: state.minions.length,
    time: Math.floor(state.survivalTime || 0),
    level: state.level,
    xp: state.xp,
    xpNeeded: state.xpNeeded,
    bossActive: !!boss,
    bossHp: boss ? Math.max(0, Math.ceil(boss.hp)) : 0,
    bossMaxHp: boss ? boss.maxHp : 0,
  };
}

export const INITIAL_HUD: Hud = {
  hp: 100,
  maxHp: 100,
  coins: 0,
  score: 0,
  round: 1,
  enemiesLeft: 0,
  arrows: 0,
  hasBow: false,
  armor: 0,
  levels: {},
  dashCd: 0,
  shieldCd: 0,
  speedBoost: 0,
  damageBoost: 0,
  aura: 0,
  hasFlame: false,
  hasElectric: false,
  fuel: 0,
  minions: 0,
  time: 0,
  level: 1,
  xp: 0,
  xpNeeded: 100,
  bossActive: false,
  bossHp: 0,
  bossMaxHp: 0,
};
