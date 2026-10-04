export type GameMode = 'classic' | 'endless';
export type Phase = 'start' | 'tutorial' | 'playing' | 'market' | 'levelup' | 'dead';
export type EnemyType = 'melee' | 'ranged' | 'warp' | 'tank' | 'boss';
export type PowerupType = 'health' | 'speed' | 'damage' | 'arrows';
export type ObstacleKind = 'log' | 'stone';
export type MinionType = 'slime' | 'burner';
export type AnimName = 'idle' | 'walk' | 'dash' | 'attack' | 'hurt' | 'death';

export interface Vec {
  x: number;
  y: number;
}

export interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  facing: Vec;
  attackCooldown: number;
  attackTime: number;
  invuln: number;
  damage: number;
  attackSpeed: number;
  attackRange: number;
  regen: number;
  bow: boolean;
  arrows: number;
  bowDamage: number;
  bowSpeed: number;
  bowCooldown: number;
  bowDrawTime: number;
  armor: number;
  dashCooldown: number;
  dashTime: number;
  dashDir: Vec;
  dashDamage: number;
  dashCdMax: number;
  shieldCooldown: number;
  shieldTime: number;
  shieldDir: Vec;
  shieldCdMax: number;
  speedBoostTime: number;
  damageBoostTime: number;
  auraLevel: number;
  auraRadius: number;
  auraDps: number;
  flamethrower: boolean;
  fuel: number;
  flameDamage: number;
  flameRange: number;
  flameActive: boolean;
  electric: boolean;
  zapDamage: number;
  zapRange: number;
  zapChance: number;
  zapChains: number;
  multishot: number;
  minionDamage: number;
  minionSpeed: number;
  burnerDamage: number;
  burnerBurn: number;
  burnerCd: number;
}

export interface Burn {
  dps: number;
  time: number;
}

export interface Enemy {
  x: number;
  y: number;
  type: EnemyType;
  attackCooldown: number;
  hitFlash: number;
  wobble: number;
  size: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  coinValue: number;
  contactCooldown: number;
  /** ranged */
  preferredDist: number;
  shootCooldown: number;
  /** warp */
  teleportCd: number;
  fadeOut: number;
  fadeIn: number;
  /** boss */
  heal: number;
  burstPhase: number;
  /** runtime */
  lastDashHit?: number;
  burn?: Burn;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  size: number;
}

export interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  angle: number;
}

export interface Minion {
  x: number;
  y: number;
  size: number;
  speed: number;
  damage: number;
  cooldown: number;
  cdMax: number;
  wobble: number;
  orbit: number;
  type: MinionType;
  /** burner */
  burnDps: number;
  burnTime: number;
  range: number;
}

export interface MinionShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  burnDps: number;
  burnTime: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
  life: number;
  bob: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  val: string | number;
  life: number;
  vy: number;
  red?: boolean;
}

export interface Lightning {
  segs: Vec[];
  life: number;
}

export interface LevelUpgrade {
  key: string;
  name: string;
  desc: string;
  icon: string;
  requires?: (p: Player) => boolean;
  apply: (p: Player) => void;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  arrows: Arrow[];
  obstacles: Obstacle[];
  minions: Minion[];
  minionShots: MinionShot[];
  coins: number;
  goldEarned: number;
  kills: number;
  score: number;
  round: number;
  particles: Particle[];
  powerups: Powerup[];
  damageNumbers: DamageNumber[];
  lightning: Lightning[];
  slimeBob: number;
  levels: Record<string, number>;
  dashId: number;
  animTime: number;
  frameIndex: number;
  anim: AnimName;
  mode: GameMode;
  survivalTime: number;
  spawnTimer: number;
  xp: number;
  xpNeeded: number;
  level: number;
  pendingUpgrades: LevelUpgrade[] | null;
  transition: { t: number } | null;
  absorb: { t: number; color: string } | null;
  clearDelay: { t: number; dur: number } | null;
  prestigeAwarded: boolean;
  statsAwarded: boolean;
}

/** Snapshot of the game state that the React HUD renders. */
export interface Hud {
  hp: number;
  maxHp: number;
  coins: number;
  score: number;
  round: number;
  enemiesLeft: number;
  arrows: number;
  hasBow: boolean;
  armor: number;
  levels: Record<string, number>;
  dashCd: number;
  shieldCd: number;
  speedBoost: number;
  damageBoost: number;
  aura: number;
  hasFlame: boolean;
  hasElectric: boolean;
  fuel: number;
  minions: number;
  time: number;
  level: number;
  xp: number;
  xpNeeded: number;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
}

export interface Input {
  /** Lower-cased `KeyboardEvent.key` -> pressed */
  keys: Record<string, boolean>;
  /** Mouse position in canvas units */
  mouse: Vec;
}

export interface ShopItem {
  key: string;
  name: string;
  desc: string;
  icon: string;
  baseCost: number;
  growth: number;
  max: number;
}

export interface PrestigeItem {
  key: string;
  name: string;
  desc: string;
  icon: string;
  baseCost: number;
  costGrowth: number;
  max: number;
}

export type Unlocks = Record<string, number>;
