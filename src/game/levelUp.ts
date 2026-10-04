import type { LevelUpgrade, Player } from './types';

/** Endless mode: pick-one-of-three upgrades offered on level up. */
export const LEVEL_UPGRADES: LevelUpgrade[] = [
  {
    key: 'zapUnlock',
    name: 'Electric Zap',
    desc: 'Attacks may chain lightning',
    icon: '⚡',
    requires: (p) => !p.electric,
    apply: (p) => {
      p.electric = true;
    },
  },
  {
    key: 'zapDamage',
    name: 'Storm Power',
    desc: '+25 Lightning Damage',
    icon: '🌩️',
    requires: (p) => p.electric,
    apply: (p) => {
      p.zapDamage += 25;
    },
  },
  {
    key: 'zapRange',
    name: 'Arc Reach',
    desc: '+50 Lightning Bridge Range',
    icon: '🔗',
    requires: (p) => p.electric,
    apply: (p) => {
      p.zapRange += 50;
    },
  },
  {
    key: 'maxHp',
    name: 'Vitality',
    desc: '+30 Max HP & full heal',
    icon: '❤️',
    apply: (p) => {
      p.maxHp += 30;
      p.hp = p.maxHp;
    },
  },
  {
    key: 'damage',
    name: 'Sharpened Blade',
    desc: '+15 Sword Damage',
    icon: '⚔️',
    apply: (p) => {
      p.damage += 15;
    },
  },
  {
    key: 'speed',
    name: 'Swift Slime',
    desc: '+0.4 Move Speed',
    icon: '💨',
    apply: (p) => {
      p.speed += 0.4;
    },
  },
  {
    key: 'armor',
    name: 'Iron Skin',
    desc: '+3 Armor',
    icon: '🛡️',
    apply: (p) => {
      p.armor += 3;
    },
  },
  {
    key: 'regen',
    name: 'Regeneration',
    desc: '+1 HP/sec',
    icon: '✨',
    apply: (p) => {
      p.regen += 1;
    },
  },
  {
    key: 'attackSpeed',
    name: 'Quick Slash',
    desc: 'Faster attacks',
    icon: '🌀',
    apply: (p) => {
      p.attackSpeed = Math.max(0.15, p.attackSpeed - 0.05);
    },
  },
  {
    key: 'bow',
    name: 'Equip Bow',
    desc: 'Ranged weapon (aim w/ mouse, F)',
    icon: '🏹',
    requires: (p) => !p.bow,
    apply: (p) => {
      p.bow = true;
      p.arrows += 15;
    },
  },
  {
    key: 'multishot',
    name: 'Multi Shot',
    desc: 'Bow fires +1 arrow per shot',
    icon: '🎯',
    requires: (p) => p.bow,
    apply: (p) => {
      p.multishot += 1;
    },
  },
];

export function pickLevelUpgrades(player: Player): LevelUpgrade[] {
  const pool = LEVEL_UPGRADES.filter((u) => !u.requires || u.requires(player));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
