import { HEIGHT, WIDTH } from './constants';
import { pushCircleOutOfRect } from './geometry';
import { pickLevelUpgrades } from './levelUp';
import { ANIM_FPS } from './sprites';
import { spawnEndlessEnemy } from './state';
import {
  loadPrestige,
  loadTotalGold,
  loadTotalKills,
  savePrestige,
  saveTotalGold,
  saveTotalKills,
} from './storage';
import type { AnimName, Enemy, GameState, Input, LevelUpgrade, Obstacle, PowerupType } from './types';
import { obstaclesInView } from './world';

export interface DeathResult {
  earnedPrestige: number;
  totalPrestige: number;
  totalGold: number;
  totalKills: number;
}

export interface UpdateHooks {
  onLevelUp(level: number, choices: LevelUpgrade[]): void;
  onRoomCleared(): void;
  onDeath(result: DeathResult): void;
}

const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

function isMoving(input: Input) {
  return MOVE_KEYS.some((k) => input.keys[k]);
}

function clampToArena(o: { x: number; y: number; size: number }) {
  o.x = Math.max(o.size / 2, Math.min(WIDTH - o.size / 2, o.x));
  o.y = Math.max(o.size / 2, Math.min(HEIGHT - o.size / 2, o.y));
}

function burst(
  state: GameState,
  x: number,
  y: number,
  count: number,
  speed: number,
  life: number,
  color: string,
) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      life,
      color,
    });
  }
}

/** Advances the hero's sprite animation. Safe to call while dead so the death animation can play. */
export function updateAnimation(state: GameState, moving: boolean, dt: number) {
  const p = state.player;
  let anim: AnimName;
  if (p.hp <= 0) anim = 'death';
  else if (p.dashTime > 0) anim = 'dash';
  else if (p.attackTime > 0) anim = 'attack';
  else if (p.invuln > 0.35) anim = 'hurt';
  else if (moving) anim = 'walk';
  else anim = 'idle';

  if (anim !== state.anim) {
    state.anim = anim;
    state.frameIndex = 0;
    state.animTime = 0;
  }
  state.animTime += dt;
  const frameDur = 1 / ANIM_FPS[anim];
  while (state.animTime > frameDur) {
    state.animTime -= frameDur;
    state.frameIndex += 1;
  }
}

/**
 * One simulation step.
 * @param movementOnly In the shop, the player can still waddle around but nothing else happens.
 */
export function updateGame(
  state: GameState,
  input: Input,
  dt: number,
  movementOnly: boolean,
  hooks: UpdateHooks,
) {
  const p = state.player;
  const keys = input.keys;
  const dmgMult = p.damageBoostTime > 0 ? 1.5 : 1;
  const endless = state.mode === 'endless';
  const obstacles: Obstacle[] = endless
    ? obstaclesInView(p.x - WIDTH / 2, p.y - HEIGHT / 2, WIDTH, HEIGHT)
    : state.obstacles;
  // Aim vector from the player toward the mouse (in endless mode the player is always at screen center).
  const aim = endless
    ? { x: input.mouse.x - WIDTH / 2, y: input.mouse.y - HEIGHT / 2 }
    : { x: input.mouse.x - p.x, y: input.mouse.y - p.y };

  /** Electric Zap: chance to arc lightning from a hit enemy to nearby enemies. */
  const tryZap = (target: Enemy | null) => {
    if (!p.electric || !target || target.hp <= 0 || Math.random() > p.zapChance) return;
    const segs = [
      { x: p.x, y: p.y },
      { x: target.x, y: target.y },
    ];
    const hit = new Set<Enemy>([target]);
    let from = target;
    for (let i = 0; i < p.zapChains; i++) {
      let next: Enemy | null = null;
      let best = p.zapRange;
      for (const e of state.enemies) {
        if (hit.has(e) || e.hp <= 0) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d < best) {
          best = d;
          next = e;
        }
      }
      if (!next) break;
      next.hp -= p.zapDamage * dmgMult;
      next.hitFlash = 0.12;
      state.damageNumbers.push({
        x: next.x,
        y: next.y,
        val: Math.round(p.zapDamage * dmgMult),
        life: 0.7,
        vy: -26,
      });
      segs.push({ x: next.x, y: next.y });
      hit.add(next);
      from = next;
    }
    state.lightning.push({ segs, life: 0.2 });
  };

  state.slimeBob += dt * 4;
  if (state.absorb) {
    state.absorb.t += dt;
    if (state.absorb.t > 0.7) state.absorb = null;
  }

  const moving = isMoving(input);
  updateAnimation(state, moving, dt);

  // ----- Movement -----
  let mx = 0;
  let my = 0;
  if (keys.w || keys.arrowup) my -= 1;
  if (keys.s || keys.arrowdown) my += 1;
  if (keys.a || keys.arrowleft) mx -= 1;
  if (keys.d || keys.arrowright) mx += 1;

  if (p.dashTime > 0) {
    const sp = p.speed * 3.4;
    p.x += p.dashDir.x * sp;
    p.y += p.dashDir.y * sp;
    p.facing = { x: p.dashDir.x, y: p.dashDir.y };
  } else if (mx || my) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const sp = p.speed * (p.speedBoostTime > 0 ? 1.6 : 1);
    p.x += mx * sp;
    p.y += my * sp;
    p.facing = { x: mx, y: my };
  }
  if (!endless) clampToArena(p);
  for (const o of obstacles) {
    const c = pushCircleOutOfRect(p.x, p.y, p.size / 2, o);
    p.x = c.x;
    p.y = c.y;
  }
  if (movementOnly) return;

  // ----- Dash damage -----
  if (p.dashTime > 0) {
    for (const e of state.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) < (e.size + p.size) / 2 + 4 && e.lastDashHit !== state.dashId) {
        e.lastDashHit = state.dashId;
        const dmg = p.dashDamage * dmgMult;
        e.hp -= dmg;
        e.hitFlash = 0.12;
        state.damageNumbers.push({ x: e.x, y: e.y, val: Math.round(dmg), life: 0.8, vy: -30 });
        const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
        e.x += ((e.x - p.x) / d) * 28;
        e.y += ((e.y - p.y) / d) * 28;
        tryZap(e);
      }
    }
  }

  // ----- Timers -----
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  p.attackTime = Math.max(0, p.attackTime - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.dashTime = Math.max(0, p.dashTime - dt);
  p.shieldCooldown = Math.max(0, p.shieldCooldown - dt);
  p.shieldTime = Math.max(0, p.shieldTime - dt);
  p.speedBoostTime = Math.max(0, p.speedBoostTime - dt);
  p.damageBoostTime = Math.max(0, p.damageBoostTime - dt);

  /** Damage taken is halved while dashing. */
  const takenMult = p.dashTime > 0 ? 0.5 : 1;

  // ----- Sword -----
  if (keys[' '] && p.attackCooldown <= 0) {
    p.attackCooldown = p.attackSpeed;
    p.attackTime = 0.18;
    const cx = p.x + p.facing.x * p.attackRange * 0.6;
    const cy = p.y + p.facing.y * p.attackRange * 0.6;
    for (const e of state.enemies) {
      if (Math.hypot(e.x - cx, e.y - cy) < p.attackRange * 0.7) {
        const rel = { x: e.x - p.x, y: e.y - p.y };
        if (rel.x * p.facing.x + rel.y * p.facing.y > -5) {
          const dmg = p.damage * dmgMult;
          e.hp -= dmg;
          e.hitFlash = 0.12;
          state.damageNumbers.push({ x: e.x, y: e.y, val: Math.round(dmg), life: 0.8, vy: -30 });
          const d = Math.hypot(rel.x, rel.y) || 1;
          e.x += (rel.x / d) * 14;
          e.y += (rel.y / d) * 14;
          tryZap(e);
        }
      }
    }
  }

  // ----- Bow -----
  p.bowCooldown = Math.max(0, p.bowCooldown - dt);
  p.bowDrawTime = Math.max(0, p.bowDrawTime - dt);
  if (keys.f && p.bow && p.arrows > 0 && p.bowCooldown <= 0) {
    p.bowCooldown = p.bowSpeed;
    p.bowDrawTime = 0.3;
    p.arrows -= 1;
    const speed = 440;
    const baseAngle = Math.atan2(aim.y, aim.x);
    const count = 1 + (p.multishot || 0);
    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.16 : 0;
      const angle = baseAngle + spread;
      state.arrows.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: p.bowDamage * dmgMult,
        life: 2,
        angle,
      });
    }
  }

  // ----- Flamethrower -----
  if (p.flamethrower) {
    if (keys.g && p.fuel > 0) {
      p.flameActive = true;
      p.fuel = Math.max(0, p.fuel - dt * 6);
      const ax = input.mouse.x - p.x;
      const ay = input.mouse.y - p.y;
      const al = Math.hypot(ax, ay) || 1;
      const dirX = ax / al;
      const dirY = ay / al;
      const angle = Math.atan2(dirY, dirX);
      for (const e of state.enemies) {
        const ex = e.x - p.x;
        const ey = e.y - p.y;
        const ed = Math.hypot(ex, ey) || 1;
        if (ed < p.flameRange + e.size / 2 && (ex / ed) * dirX + (ey / ed) * dirY > 0.6) {
          e.hp -= p.flameDamage * dmgMult * dt;
          if (Math.random() < dt * 8) {
            state.damageNumbers.push({
              x: e.x,
              y: e.y,
              val: Math.round(p.flameDamage * dmgMult),
              life: 0.5,
              vy: -24,
            });
          }
          if (Math.random() < dt * 2) tryZap(e);
        }
      }
      for (let i = 0; i < 3; i++) {
        const a = angle + (Math.random() - 0.5) * 0.5;
        const sp = 120 + Math.random() * 120;
        state.particles.push({
          x: p.x + dirX * 14,
          y: p.y + dirY * 14,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.4 + Math.random() * 0.3,
          color: Math.random() < 0.5 ? '#fb923c' : '#fcd34d',
        });
      }
    } else {
      p.flameActive = false;
    }
  }

  // ----- Regen -----
  if (p.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  // ----- Enemies -----
  for (const e of state.enemies) {
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.wobble += dt * 6;
    if (e.burn && e.burn.time > 0) {
      e.hp -= e.burn.dps * dt;
      e.burn.time -= dt;
      if (Math.random() < dt * 6) {
        state.particles.push({
          x: e.x,
          y: e.y,
          vx: (Math.random() - 0.5) * 40,
          vy: -30,
          life: 0.4,
          color: '#fb923c',
        });
      }
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.type === 'ranged') {
      const pref = e.preferredDist;
      if (dist > pref + 20) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      } else if (dist < pref - 20) {
        e.x -= (dx / dist) * e.speed;
        e.y -= (dy / dist) * e.speed;
      }
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0 && dist < 400) {
        e.shootCooldown = 1.8;
        state.projectiles.push({
          x: e.x,
          y: e.y,
          vx: (dx / dist) * 260,
          vy: (dy / dist) * 260,
          damage: e.damage,
          life: 3,
          size: 8,
        });
      }
    } else if (e.type === 'boss') {
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
      if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.heal * dt);
      e.shootCooldown -= dt;
      if (e.shootCooldown <= 0) {
        e.shootCooldown = 1;
        e.burstPhase = (e.burstPhase || 0) + 0.35;
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + e.burstPhase;
          state.projectiles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * 220,
            vy: Math.sin(a) * 220,
            damage: e.damage * 0.5,
            life: 4,
            size: 8,
          });
        }
      }
    } else if (e.type === 'warp') {
      e.teleportCd -= dt;
      if (e.fadeOut > 0) {
        e.fadeOut -= dt;
        if (e.fadeOut <= 0) {
          const a = Math.random() * Math.PI * 2;
          const r = 90 + Math.random() * 60;
          const tx = p.x + Math.cos(a) * r;
          const ty = p.y + Math.sin(a) * r;
          e.x = endless ? tx : Math.max(e.size / 2, Math.min(WIDTH - e.size / 2, tx));
          e.y = endless ? ty : Math.max(e.size / 2, Math.min(HEIGHT - e.size / 2, ty));
          burst(state, e.x, e.y, 8, 160, 0.5, '#c4b5fd');
          e.fadeIn = 0.35;
        }
      } else if (e.fadeIn > 0) {
        e.fadeIn -= dt;
      } else {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
        if (e.teleportCd <= 0) {
          e.teleportCd = 2.2;
          e.fadeOut = 0.35;
          burst(state, e.x, e.y, 8, 160, 0.5, '#a78bfa');
        }
      }
    } else {
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
    }

    if (!endless) clampToArena(e);
    for (const o of obstacles) {
      const c = pushCircleOutOfRect(e.x, e.y, e.size / 2, o);
      e.x = c.x;
      e.y = c.y;
    }

    // Shield pushes enemies in front of it away.
    if (p.shieldTime > 0 && dist < 64 && -(dx * p.shieldDir.x + dy * p.shieldDir.y) / dist > 0.2) {
      e.x -= (dx / dist) * 6;
      e.y -= (dy / dist) * 6;
    }

    if (e.type !== 'ranged') {
      e.contactCooldown = Math.max(0, e.contactCooldown - dt);
      const phased = e.fadeOut > 0 || e.fadeIn > 0.2;
      if (!phased && dist < (e.size + p.size) / 2 && e.contactCooldown <= 0 && p.invuln <= 0) {
        p.hp -= Math.max(1, (e.damage - p.armor) * takenMult);
        p.invuln = 0.6;
        e.contactCooldown = 0.8;
        state.damageNumbers.push({ x: p.x, y: p.y, val: Math.round(e.damage), life: 0.8, vy: -30, red: true });
      }
    }
  }

  // ----- Aura -----
  if (p.auraLevel > 0) {
    for (const e of state.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.auraRadius + e.size / 2) {
        e.hp -= p.auraDps * dt;
        if (Math.random() < dt * 5) {
          state.damageNumbers.push({ x: e.x, y: e.y, val: Math.round(p.auraDps), life: 0.5, vy: -24 });
        }
        if (Math.random() < dt * 8) {
          state.particles.push({
            x: e.x,
            y: e.y,
            vx: (Math.random() - 0.5) * 50,
            vy: -30 - Math.random() * 40,
            life: 0.5,
            color: '#a3e635',
          });
        }
      }
    }
  }

  // ----- Minions -----
  for (const m of state.minions) {
    m.wobble += dt * 8;
    m.orbit += dt * 1.5;
    m.cooldown = Math.max(0, m.cooldown - dt);
    let target: Enemy | null = null;
    let best = Infinity;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - m.x, e.y - m.y);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    if (target) {
      const tx = target.x - m.x;
      const ty = target.y - m.y;
      const td = Math.hypot(tx, ty) || 1;
      if (m.type === 'burner') {
        const range = m.range || 280;
        if (td > range) {
          m.x += (tx / td) * m.speed;
          m.y += (ty / td) * m.speed;
        } else if (td < range - 70) {
          m.x -= (tx / td) * m.speed;
          m.y -= (ty / td) * m.speed;
        }
        if (m.cooldown <= 0 && td < range) {
          m.cooldown = m.cdMax;
          const sp = 320;
          state.minionShots.push({
            x: m.x,
            y: m.y,
            vx: (tx / td) * sp,
            vy: (ty / td) * sp,
            damage: m.damage,
            burnDps: m.burnDps,
            burnTime: m.burnTime,
            life: 2.5,
          });
        }
      } else if (td > (target.size + m.size) / 2) {
        m.x += (tx / td) * m.speed;
        m.y += (ty / td) * m.speed;
      } else if (m.cooldown <= 0) {
        m.cooldown = m.cdMax || 0.6;
        target.hp -= m.damage * dmgMult;
        target.hitFlash = 0.12;
        state.damageNumbers.push({
          x: target.x,
          y: target.y,
          val: Math.round(m.damage * dmgMult),
          life: 0.7,
          vy: -26,
        });
      }
    } else {
      // idle: orbit the player
      const ox = p.x + Math.cos(m.orbit) * 50;
      const oy = p.y + Math.sin(m.orbit) * 50;
      const tx = ox - m.x;
      const ty = oy - m.y;
      const td = Math.hypot(tx, ty) || 1;
      m.x += (tx / td) * m.speed * 0.6;
      m.y += (ty / td) * m.speed * 0.6;
    }
    clampToArena(m);
  }

  // ----- Enemy projectiles -----
  for (const pr of state.projectiles) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    const d = Math.hypot(pr.x - p.x, pr.y - p.y);
    if (p.shieldTime > 0 && d < 58) {
      const dn = d || 1;
      if (((pr.x - p.x) / dn) * p.shieldDir.x + ((pr.y - p.y) / dn) * p.shieldDir.y > 0.25) {
        pr.life = 0;
        continue;
      }
    }
    if (d < (pr.size + p.size) / 2 && p.invuln <= 0) {
      p.hp -= Math.max(1, (pr.damage - p.armor) * takenMult);
      p.invuln = 0.5;
      pr.life = 0;
      state.damageNumbers.push({ x: p.x, y: p.y, val: Math.round(pr.damage), life: 0.8, vy: -30, red: true });
    }
    for (const o of obstacles) {
      if (pr.x > o.x && pr.x < o.x + o.w && pr.y > o.y && pr.y < o.y + o.h) pr.life = 0;
    }
  }

  const bounds = endless
    ? { x0: p.x - WIDTH, x1: p.x + WIDTH, y0: p.y - HEIGHT, y1: p.y + HEIGHT }
    : { x0: -20, x1: WIDTH + 20, y0: -20, y1: HEIGHT + 20 };
  const inBounds = (o: { x: number; y: number; life: number }) =>
    o.life > 0 && o.x > bounds.x0 && o.x < bounds.x1 && o.y > bounds.y0 && o.y < bounds.y1;
  state.projectiles = state.projectiles.filter(inBounds);

  // ----- Arrows -----
  for (const ar of state.arrows) {
    ar.x += ar.vx * dt;
    ar.y += ar.vy * dt;
    ar.life -= dt;
    for (const e of state.enemies) {
      if (ar.life > 0 && Math.hypot(e.x - ar.x, e.y - ar.y) < e.size / 2 + 6) {
        e.hp -= ar.damage;
        e.hitFlash = 0.12;
        state.damageNumbers.push({ x: e.x, y: e.y, val: Math.round(ar.damage), life: 0.8, vy: -30 });
        const d = Math.hypot(e.x - ar.x, e.y - ar.y) || 1;
        e.x += ((e.x - ar.x) / d) * 8;
        e.y += ((e.y - ar.y) / d) * 8;
        tryZap(e);
        ar.life = 0;
      }
    }
    for (const o of obstacles) {
      if (ar.life > 0 && ar.x > o.x && ar.x < o.x + o.w && ar.y > o.y && ar.y < o.y + o.h) ar.life = 0;
    }
  }
  state.arrows = state.arrows.filter(inBounds);

  // ----- Burner fireballs -----
  for (const s of state.minionShots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    for (const e of state.enemies) {
      if (s.life > 0 && Math.hypot(e.x - s.x, e.y - s.y) < e.size / 2 + 8) {
        e.hp -= s.damage * dmgMult;
        e.hitFlash = 0.12;
        e.burn = { dps: s.burnDps * dmgMult, time: s.burnTime };
        state.damageNumbers.push({
          x: e.x,
          y: e.y,
          val: Math.round(s.damage * dmgMult),
          life: 0.7,
          vy: -26,
        });
        burst(state, e.x, e.y, 6, 120, 0.4, '#fb923c');
        s.life = 0;
      }
    }
  }
  state.minionShots = state.minionShots.filter(inBounds);

  // ----- Deaths, loot and drops -----
  state.enemies = state.enemies.filter((e) => {
    if (e.hp > 0) return true;
    state.kills += 1;
    if (endless) {
      state.xp += e.coinValue * 2 + 8;
    } else {
      state.coins += e.coinValue;
      state.goldEarned += e.coinValue;
      state.score += e.coinValue * 5;
    }
    burst(state, e.x, e.y, 6, 120, 0.5, '#fbbf24');
    const bossRound = state.round % 5 === 0;
    const dropChance = e.type === 'boss' ? 1 : bossRound ? 0.45 : 0.13;
    const drops = e.type === 'boss' ? 3 : 1;
    for (let i = 0; i < drops; i++) {
      if (e.type === 'boss' || Math.random() < dropChance) {
        const r = Math.random();
        const type: PowerupType = r < 0.35 ? 'health' : r < 0.6 ? 'speed' : r < 0.85 ? 'damage' : 'arrows';
        state.powerups.push({ x: e.x + (i - 1) * 20, y: e.y, type, life: 14, bob: Math.random() * Math.PI * 2 });
      }
    }
    return false;
  });

  // ----- Endless level-up -----
  if (endless && state.xp >= state.xpNeeded && !state.pendingUpgrades) {
    state.level += 1;
    state.xp -= state.xpNeeded;
    state.xpNeeded = Math.round(state.xpNeeded * 1.25);
    state.pendingUpgrades = pickLevelUpgrades(p);
    hooks.onLevelUp(state.level, state.pendingUpgrades);
  }

  // ----- Power-ups -----
  for (const pu of state.powerups) {
    pu.life -= dt;
    pu.bob += dt * 3;
    if (Math.hypot(pu.x - p.x, pu.y - p.y) < p.size / 2 + 14) {
      pu.life = 0;
      if (pu.type === 'health') {
        p.hp = Math.min(p.maxHp, p.hp + 35);
        state.damageNumbers.push({ x: p.x, y: p.y, val: '+35', life: 1, vy: -30 });
      } else if (pu.type === 'speed') {
        p.speedBoostTime = 8;
      } else if (pu.type === 'damage') {
        p.damageBoostTime = 8;
      } else {
        p.arrows += 15;
        state.damageNumbers.push({ x: p.x, y: p.y, val: '+15 arrows', life: 1, vy: -30 });
      }
      const color =
        pu.type === 'health' ? '#f87171' : pu.type === 'speed' ? '#67e8f9' : pu.type === 'damage' ? '#fb923c' : '#fcd34d';
      burst(state, pu.x, pu.y, 10, 160, 0.6, color);
    }
  }
  state.powerups = state.powerups.filter((pu) => pu.life > 0);

  // ----- Effects decay -----
  for (const l of state.lightning) l.life -= dt;
  state.lightning = state.lightning.filter((l) => l.life > 0);
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
  for (const dn of state.damageNumbers) {
    dn.y += dn.vy * dt;
    dn.life -= dt;
  }
  state.damageNumbers = state.damageNumbers.filter((dn) => dn.life > 0);

  // ----- Endless spawning -----
  if (endless) {
    state.survivalTime += dt;
    state.score = Math.floor(state.survivalTime * 10);
    state.spawnTimer -= dt;
    const interval = Math.max(0.5, 1.9 - state.survivalTime * 0.012);
    if (state.spawnTimer <= 0) {
      state.spawnTimer = interval;
      const difficulty = 1 + Math.floor(state.survivalTime / 20);
      const count = 1 + Math.floor(state.survivalTime / 45);
      for (let i = 0; i < count; i++) spawnEndlessEnemy(state, difficulty);
    }
    if (state.enemies.length > 45) state.enemies.length = 45;
  }

  // ----- Room cleared -> descend to the shop -----
  if (!endless && state.enemies.length === 0 && !state.transition && !state.clearDelay) {
    state.clearDelay = { t: 0, dur: 1.6 };
  }
  if (state.clearDelay) {
    state.clearDelay.t += dt;
    if (state.clearDelay.t >= state.clearDelay.dur) {
      state.transition = { t: 0 };
      state.clearDelay = null;
    }
  }
  if (state.transition) {
    state.transition.t += dt;
    const t = state.transition.t;
    if (t < 0.5) {
      p.x += (WIDTH / 2 - p.x) * Math.min(1, dt * 6);
      p.y += (HEIGHT / 2 - p.y) * Math.min(1, dt * 6);
    }
    if (t >= 1) {
      state.score += state.round * 100;
      state.transition = null;
      p.x = WIDTH / 2;
      p.y = HEIGHT - 50;
      state.particles = [];
      state.damageNumbers = [];
      state.minionShots = [];
      hooks.onRoomCleared();
    }
  }

  // ----- Death -----
  if (p.hp <= 0) {
    const earned = endless ? Math.floor(state.survivalTime / 60) : Math.floor(state.round / 10);
    let totalPrestige = loadPrestige();
    if (earned > 0 && !state.prestigeAwarded) {
      state.prestigeAwarded = true;
      totalPrestige += earned;
      savePrestige(totalPrestige);
    }
    let totalGold = loadTotalGold();
    let totalKills = loadTotalKills();
    if (!state.statsAwarded) {
      state.statsAwarded = true;
      totalGold += state.goldEarned || 0;
      totalKills += state.kills || 0;
      saveTotalGold(totalGold);
      saveTotalKills(totalKills);
    }
    hooks.onDeath({ earnedPrestige: earned, totalPrestige, totalGold, totalKills });
  }
}
