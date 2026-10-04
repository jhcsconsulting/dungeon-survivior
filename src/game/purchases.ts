import { createBurnerMinion, createSlimeMinion } from './entities';
import { SHOP_COLORS, SHOP_MAX_LEVELS } from './shop';
import type { GameState } from './types';

export interface Purchase {
  key: string;
  cost: number;
}

/** Applies a shop purchase to the run. Returns false if it could not be afforded or is maxed. */
export function applyPurchase(state: GameState, purchase: Purchase): boolean {
  const { key, cost } = purchase;
  const level = state.levels[key] || 0;
  const max = SHOP_MAX_LEVELS[key];
  if ((max !== undefined && level >= max) || state.coins < cost) return false;

  state.coins -= cost;
  state.levels[key] = level + 1;
  const p = state.player;

  switch (key) {
    case 'maxHp':
      p.maxHp += 25;
      p.hp = p.maxHp;
      break;
    case 'damage':
      p.damage += 12;
      break;
    case 'speed':
      p.speed += 0.5;
      break;
    case 'attackSpeed':
      p.attackSpeed = Math.max(0.15, p.attackSpeed - 0.05);
      break;
    case 'range':
      p.attackRange += 12;
      break;
    case 'regen':
      p.regen += 1;
      break;
    case 'shield':
      p.armor += 2;
      break;
    case 'bow':
      p.bow = true;
      break;
    case 'arrows':
      p.arrows += 10;
      break;
    case 'bowDamage':
      p.bowDamage += 15;
      break;
    case 'bowSpeed':
      p.bowSpeed = Math.max(0.2, p.bowSpeed - 0.08);
      break;
    case 'dashCd':
      p.dashCdMax = Math.max(6, p.dashCdMax - 2);
      break;
    case 'shieldCd':
      p.shieldCdMax = Math.max(8, p.shieldCdMax - 3);
      break;
    case 'dashDamage':
      p.dashDamage += 18;
      break;
    case 'aura':
      p.auraLevel += 1;
      p.auraRadius = 48 + p.auraLevel * 18;
      p.auraDps = 8 + p.auraLevel * 6;
      break;
    case 'minions':
      state.minions.push(createSlimeMinion(p.minionDamage, p.minionSpeed));
      break;
    case 'minionDamage':
      p.minionDamage += 6;
      state.minions.forEach((m) => {
        if (m.type === 'slime') m.damage += 6;
      });
      break;
    case 'minionSpeed':
      p.minionSpeed += 0.4;
      state.minions.forEach((m) => {
        if (m.type === 'slime') m.speed += 0.4;
      });
      break;
    case 'burner':
      state.minions.push(createBurnerMinion(p.burnerDamage, p.burnerBurn, p.burnerCd));
      break;
    case 'burnerDamage':
      p.burnerDamage += 8;
      state.minions.forEach((m) => {
        if (m.type === 'burner') m.damage += 8;
      });
      break;
    case 'burnerBurn':
      p.burnerBurn += 4;
      state.minions.forEach((m) => {
        if (m.type === 'burner') m.burnDps += 4;
      });
      break;
    case 'burnerRate':
      p.burnerCd = Math.max(0.4, p.burnerCd - 0.25);
      state.minions.forEach((m) => {
        if (m.type === 'burner') m.cdMax = Math.max(0.4, m.cdMax - 0.25);
      });
      break;
    case 'flamethrower':
      p.flamethrower = true;
      break;
    case 'fuel':
      p.fuel += 30;
      break;
    case 'electric':
      p.electric = true;
      break;
    case 'zapDamage':
      p.zapDamage += 20;
      break;
    case 'zapRange':
      p.zapRange += 40;
      break;
    case 'multishot':
      p.multishot += 1;
      break;
  }

  state.absorb = { t: 0, color: SHOP_COLORS[key] || '#a3e635' };
  return true;
}
