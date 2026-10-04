import type { Unlocks } from './types';

const PRESTIGE_KEY = 'slime_prestige';
const UNLOCKS_KEY = 'slime_unlocks';
const TOTAL_GOLD_KEY = 'slime_total_gold';
const TOTAL_KILLS_KEY = 'slime_total_kills';

function readInt(key: string): number {
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function writeInt(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable */
  }
}

export const loadPrestige = () => readInt(PRESTIGE_KEY);
export const savePrestige = (v: number) => writeInt(PRESTIGE_KEY, v);

export function loadUnlocks(): Unlocks {
  try {
    return JSON.parse(localStorage.getItem(UNLOCKS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveUnlocks(u: Unlocks) {
  try {
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(u));
  } catch {
    /* storage unavailable */
  }
}

export const loadTotalGold = () => readInt(TOTAL_GOLD_KEY);
export const saveTotalGold = (v: number) => writeInt(TOTAL_GOLD_KEY, v);
export const loadTotalKills = () => readInt(TOTAL_KILLS_KEY);
export const saveTotalKills = (v: number) => writeInt(TOTAL_KILLS_KEY, v);
