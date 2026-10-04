import { drawBackground } from './biomes';
import { HEIGHT, SPRITE_BODY_PX, SPRITE_FRAME_SIZE, WIDTH } from './constants';
import { roundRect } from './geometry';
import { ANIM_HOLD_LAST, type SpriteFrames } from './sprites';
import type { Enemy, GameState, Input, Obstacle } from './types';
import { obstaclesInView } from './world';

type Ctx = CanvasRenderingContext2D;

/** Generic glossy blob with two eyes, used for enemies and minions. */
function drawBlob(ctx: Ctx, x: number, y: number, size: number, color: string, highlight?: string) {
  const r = size / 2;
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, highlight || color);
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x - size / 6, y - 2, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size / 6, y - 2, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - size / 6 + 1, y - 3, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size / 6 + 1, y - 3, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawWarpBody(ctx: Ctx, x: number, y: number, size: number, flash: boolean) {
  const r = size / 2;
  ctx.fillStyle = 'rgba(167,139,250,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.25, r, 0, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, flash ? '#fef08a' : '#ddd6fe');
  grad.addColorStop(1, flash ? '#fde68a' : '#7c3aed');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [ox, oy] of [
    [-0.35, -0.1],
    [0.3, -0.2],
    [0, 0.35],
  ]) {
    ctx.beginPath();
    ctx.arc(x + ox * r, y + oy * r, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f5d0fe';
  ctx.beginPath();
  ctx.arc(x - size / 6, y - 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size / 6, y - 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Procedural hero slime, used when sprite frames are unavailable. */
function drawSlimeHero(ctx: Ctx, x: number, y: number, size: number, flicker: boolean, t: number) {
  const r = size / 2;
  ctx.fillStyle = 'rgba(74,222,128,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 1.18, r * 0.96, 0, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, '#bbf7d0');
  grad.addColorStop(0.6, '#4ade80');
  grad.addColorStop(1, '#15803d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  for (let i = 0; i < 4; i++) {
    const bx = x - r * 0.7 + (i / 3) * r * 1.4;
    const by = (Math.sin((t || 0) * 3 + i * 1.7) * 0.5 + 0.5) * r * 0.35;
    ctx.beginPath();
    ctx.arc(bx, y + r * 0.55 + by, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.25, r * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x + r * 0.2, y - r * 0.45, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  if (flicker) {
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size / 5, y - 2);
    ctx.lineTo(x - size / 12, y - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size / 12, y - 2);
    ctx.lineTo(x + size / 5, y - 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x - size / 6, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size / 6, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - size / 6 + 1, y - 3, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size / 6 + 1, y - 3, 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y + size / 6, 3, 0, Math.PI);
  ctx.stroke();
}

function drawObstacle(ctx: Ctx, o: Obstacle) {
  if (o.kind === 'log') {
    ctx.fillStyle = '#6b4a2b';
    roundRect(ctx, o.x, o.y, o.w, o.h, o.h / 2);
    ctx.fill();
    ctx.fillStyle = '#8a6437';
    roundRect(ctx, o.x + 2, o.y + 2, o.w - 4, o.h - 4, (o.h - 4) / 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3520';
    ctx.lineWidth = 2;
    for (const cx of [o.x + o.h / 2, o.x + o.w - o.h / 2]) {
      ctx.beginPath();
      ctx.ellipse(cx, o.y + o.h / 2, o.h / 3, o.h / 2 - 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, o.y + o.h / 2, o.h / 5, o.h / 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    return;
  }
  const cx = o.x + o.w / 2;
  const cy = o.y + o.h / 2;
  const r = Math.min(o.w, o.h) / 2;
  ctx.fillStyle = '#787c8a';
  ctx.beginPath();
  const sides = 7;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const rr = r * (0.82 + Math.sin(i * 1.7) * 0.12);
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9aa0ad';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.25, cy - r * 0.3, r * 0.4, r * 0.25, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#565a67';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.3, cy + r * 0.1);
  ctx.lineTo(cx + r * 0.1, cy + r * 0.35);
  ctx.lineTo(cx + r * 0.4, cy + r * 0.15);
  ctx.stroke();
}

function drawEnemy(ctx: Ctx, e: Enemy) {
  const wob = Math.sin(e.wobble) * 2;
  const size = e.size + wob;
  const flash = e.hitFlash > 0;

  if (e.burn && e.burn.time > 0) {
    const a = 0.55 + Math.sin(e.wobble * 9) * 0.25;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    const g = ctx.createRadialGradient(e.x, e.y, e.size * 0.2, e.x, e.y, e.size * 0.95);
    g.addColorStop(0, 'rgba(251,146,60,0.75)');
    g.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (e.type === 'melee') {
    const bob = Math.sin(e.wobble * 1.5) * 1.5;
    drawBlob(ctx, e.x, e.y + bob, size, flash ? '#fef08a' : '#dc2626', '#fca5a5');
    ctx.fillStyle = flash ? '#fde68a' : '#b91c1c';
    for (let i = -1; i <= 1; i++) {
      const sx = e.x + (i * e.size) / 4;
      const sway = Math.sin(e.wobble + i) * 3;
      ctx.beginPath();
      ctx.moveTo(sx - 4, e.y + bob - e.size / 2 + 2);
      ctx.lineTo(sx + sway, e.y + bob - e.size / 2 - 9);
      ctx.lineTo(sx + 4, e.y + bob - e.size / 2 + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x - e.size / 5, e.y + bob - e.size / 6);
    ctx.lineTo(e.x - e.size / 12, e.y + bob - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.x + e.size / 5, e.y + bob - e.size / 6);
    ctx.lineTo(e.x + e.size / 12, e.y + bob - 3);
    ctx.stroke();
  } else if (e.type === 'ranged') {
    const bob = Math.sin(e.wobble * 0.9) * 3;
    drawBlob(ctx, e.x, e.y + bob, size, flash ? '#fef08a' : '#7c3aed', '#ddd6fe');
    const sway = Math.sin(e.wobble) * 3;
    ctx.strokeStyle = '#ddd6fe';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + bob - e.size / 2);
    ctx.lineTo(e.x + sway, e.y + bob - e.size);
    ctx.stroke();
    const orb = 4.5 + Math.sin(e.wobble * 2) * 1.3;
    ctx.fillStyle = '#f0abfc';
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(e.x + sway, e.y + bob - e.size, orb, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (e.type === 'warp') {
    let alpha = 1;
    let scale = 1;
    if (e.fadeOut > 0) {
      alpha = scale = e.fadeOut / 0.35;
    } else if (e.fadeIn > 0) {
      alpha = scale = 1 - e.fadeIn / 0.35;
    }
    ctx.globalAlpha = Math.max(0.15, alpha);
    drawWarpBody(ctx, e.x, e.y, size * scale, flash);
    for (let i = 0; i < 3; i++) {
      const a = e.wobble * 1.5 + (i * Math.PI * 2) / 3;
      const r = e.size * 0.75 * scale;
      ctx.fillStyle = 'rgba(232,121,249,0.9)';
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (e.type === 'boss') {
    const bob = Math.sin(e.wobble * 0.5) * 3;
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(e.wobble) * 0.08;
    const g = ctx.createRadialGradient(e.x, e.y + bob, e.size * 0.3, e.x, e.y + bob, e.size * 0.95);
    g.addColorStop(0, 'rgba(248,113,113,0.5)');
    g.addColorStop(1, 'rgba(248,113,113,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob, e.size * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawBlob(ctx, e.x, e.y + bob, size, flash ? '#fef08a' : '#991b1b', '#fca5a5');
    // crown
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(e.x - e.size / 3, e.y + bob - e.size / 2);
    ctx.lineTo(e.x - e.size / 3, e.y + bob - e.size / 1.4);
    ctx.lineTo(e.x - e.size / 6, e.y + bob - e.size / 1.1);
    ctx.lineTo(e.x, e.y + bob - e.size / 1.4);
    ctx.lineTo(e.x + e.size / 6, e.y + bob - e.size / 1.1);
    ctx.lineTo(e.x + e.size / 3, e.y + bob - e.size / 1.4);
    ctx.lineTo(e.x + e.size / 3, e.y + bob - e.size / 2);
    ctx.closePath();
    ctx.fill();
    const gem = 2.5 + Math.sin(e.wobble * 2) * 0.8;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(e.x, e.y + bob - e.size / 1.55, gem, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(e.x - e.size / 2.5, e.y + bob - e.size / 2.5);
    ctx.lineTo(e.x - e.size / 1.8, e.y + bob - e.size / 1.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.x + e.size / 2.5, e.y + bob - e.size / 2.5);
    ctx.lineTo(e.x + e.size / 1.8, e.y + bob - e.size / 1.4);
    ctx.stroke();
  } else {
    // tank
    const bob = -Math.abs(Math.sin(e.wobble * 0.8)) * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.size / 2, e.size / 2, e.size / 7, 0, 0, Math.PI * 2);
    ctx.fill();
    drawBlob(ctx, e.x, e.y + bob, size, flash ? '#fef08a' : '#475569', '#94a3b8');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(e.x - e.size / 3, e.y + bob - e.size / 3, e.size / 1.5, 5);
    ctx.fillRect(e.x - e.size / 3, e.y + bob + e.size / 6, e.size / 1.5, 5);
    ctx.fillStyle = '#64748b';
    for (const i of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.arc(e.x + (i * e.size) / 5, e.y + bob - e.size / 3 + 2.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const tread = (((e.wobble * 8) % 6) + 6) % 6;
    ctx.fillStyle = '#0f172a';
    for (let i = -2; i <= 2; i++) ctx.fillRect(e.x + i * 7 + tread - 3, e.y + bob + e.size / 2.4, 4, 4);
  }

  // health bar
  const hpFrac = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = '#374151';
  ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2 - 10, e.size, 4);
  ctx.fillStyle = hpFrac > 0.5 ? '#22c55e' : hpFrac > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2 - 10, e.size * hpFrac, 4);
}

export function drawGame(ctx: Ctx, state: GameState, input: Input, sprites: SpriteFrames | null) {
  const p = state.player;
  const endless = state.mode === 'endless';
  const cam = endless ? { x: p.x - WIDTH / 2, y: p.y - HEIGHT / 2 } : { x: 0, y: 0 };
  const aim = endless
    ? { x: input.mouse.x - WIDTH / 2, y: input.mouse.y - HEIGHT / 2 }
    : { x: input.mouse.x - p.x, y: input.mouse.y - p.y };

  drawBackground(ctx, WIDTH, HEIGHT, state.round, state.slimeBob);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  const obstacles = endless ? obstaclesInView(cam.x, cam.y, WIDTH, HEIGHT) : state.obstacles;
  for (const o of obstacles) drawObstacle(ctx, o);

  // power-ups
  for (const pu of state.powerups) {
    const style =
      pu.type === 'health'
        ? { color: '#f87171', glow: '#ef4444', icon: '❤' }
        : pu.type === 'speed'
          ? { color: '#67e8f9', glow: '#06b6d4', icon: '✦' }
          : pu.type === 'damage'
            ? { color: '#fb923c', glow: '#f97316', icon: '⚔' }
            : { color: '#fcd34d', glow: '#f59e0b', icon: '↟' };
    const bob = Math.sin(pu.bob) * 3;
    const blink = pu.life < 4 && Math.floor(pu.life * 6) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.4;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(pu.x, pu.y + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.icon, pu.x, pu.y + bob + 1);
    ctx.restore();
  }

  // particles
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // enemy projectiles
  for (const pr of state.projectiles) {
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fecaca';
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // arrows
  for (const ar of state.arrows) {
    ctx.save();
    ctx.translate(ar.x, ar.y);
    ctx.rotate(ar.angle);
    ctx.strokeStyle = '#fcd34d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(2, -4);
    ctx.lineTo(2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-13, -3);
    ctx.moveTo(-10, 0);
    ctx.lineTo(-13, 3);
    ctx.stroke();
    ctx.restore();
  }

  // burner fireballs
  for (const s of state.minionShots) {
    ctx.fillStyle = '#f97316';
    ctx.shadowColor = '#fb923c';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of state.enemies) drawEnemy(ctx, e);

  // minions
  for (const m of state.minions) {
    const wob = Math.sin(m.wobble) * 2;
    if (m.type === 'burner') {
      drawBlob(ctx, m.x, m.y + wob, m.size + wob, '#b91c1c', '#fca5a5');
      const flick = Math.sin(m.wobble * 3) * 1.5;
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(m.x, m.y - m.size / 2 - 3 + flick, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(m.x, m.y - m.size / 2 - 3 + flick, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawBlob(ctx, m.x, m.y + wob, m.size + wob, '#16a34a', '#86efac');
    }
  }

  // aura
  if (p.auraLevel > 0) {
    ctx.save();
    const pulse = 0.5 + Math.sin(state.slimeBob * 2) * 0.1;
    const g = ctx.createRadialGradient(p.x, p.y, p.size / 2, p.x, p.y, p.auraRadius);
    g.addColorStop(0, `rgba(132,204,22,${0.05 + pulse * 0.08})`);
    g.addColorStop(0.6, `rgba(132,204,22,${0.12 + pulse * 0.08})`);
    g.addColorStop(1, 'rgba(132,204,22,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.auraRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(163,230,53,${0.3 + pulse * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.auraRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // hero
  const bob = Math.sin(state.slimeBob) * 2;
  const flicker = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0;
  const frames = sprites ? sprites[state.anim] : null;
  if (frames && frames.length > 0) {
    const idx = ANIM_HOLD_LAST[state.anim]
      ? Math.min(state.frameIndex, frames.length - 1)
      : state.frameIndex % frames.length;
    const img = frames[idx];
    const scale = (p.size + 16 + bob) / SPRITE_BODY_PX;
    const dw = img.width * scale;
    const dh = img.height * scale;
    // frames are bottom-aligned 8px above the frame edge; put the body's center on the player position
    const bodyCenterY = (SPRITE_FRAME_SIZE - 8 - SPRITE_BODY_PX / 2) * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.facing.x < 0) ctx.scale(-1, 1);
    if (flicker) ctx.globalAlpha = 0.5;
    ctx.drawImage(img, -dw / 2, -bodyCenterY, dw, dh);
    ctx.restore();
    ctx.globalAlpha = 1;
  } else {
    drawSlimeHero(ctx, p.x, p.y, p.size + bob, flicker, state.slimeBob);
  }

  // bow
  if (p.bow && (p.bowDrawTime > 0 || input.keys.f)) {
    const angle = Math.atan2(aim.y, aim.x);
    const draw = Math.max(p.bowDrawTime / 0.3, input.keys.f && p.bow && p.arrows > 0 ? 0.4 : 0);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    const off = p.size / 2 + 5;
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(off, 0, 14, -1.15, 1.15);
    ctx.stroke();
    const tip1 = { x: off + Math.cos(-1.15) * 14, y: Math.sin(-1.15) * 14 };
    const tip2 = { x: off + Math.cos(1.15) * 14, y: Math.sin(1.15) * 14 };
    const pull = -5 - draw * 9;
    ctx.strokeStyle = 'rgba(229,231,235,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tip1.x, tip1.y);
    ctx.lineTo(pull, 0);
    ctx.lineTo(tip2.x, tip2.y);
    ctx.stroke();
    if (draw > 0.05) {
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pull, 0);
      ctx.lineTo(pull + 18, 0);
      ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(pull + 18, 0);
      ctx.lineTo(pull + 14, -3);
      ctx.lineTo(pull + 14, 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // flamethrower cone
  if (p.flameActive) {
    const angle = Math.atan2(aim.y, aim.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    const flick = 0.75 + Math.sin(state.slimeBob * 3) * 0.2;
    const g = ctx.createLinearGradient(0, 0, p.flameRange, 0);
    g.addColorStop(0, 'rgba(254,215,170,0.9)');
    g.addColorStop(0.4, 'rgba(251,146,60,0.7)');
    g.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.globalAlpha = flick;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, p.flameRange, -0.45, 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#52525b';
    ctx.fillRect(p.size / 2, -3, 8, 6);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // dash trail
  if (p.dashTime > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(p.x - p.dashDir.x * 9, p.y - p.dashDir.y * 9, p.size / 2 + 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // shield
  if (p.shieldTime > 0) {
    const angle = Math.atan2(p.shieldDir.y, p.shieldDir.x);
    const fade = Math.min(1, p.shieldTime);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.55 * fade;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 50, -0.75, 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 50, -0.75, 0.75);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // sword swing
  if (p.attackTime > 0) {
    const angle = Math.atan2(p.facing.y, p.facing.x);
    const prog = 1 - p.attackTime / 0.18;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.85 * (1 - prog);
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, p.attackRange, -0.7 + prog * 0.5, 0.7 - prog * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(p.attackRange, 0);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // damage numbers
  for (const dn of state.damageNumbers) {
    ctx.globalAlpha = Math.min(1, dn.life);
    ctx.fillStyle = dn.red ? '#fca5a5' : '#fde68a';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(dn.val), dn.x, dn.y);
  }
  ctx.globalAlpha = 1;

  // lightning
  for (const l of state.lightning) {
    ctx.globalAlpha = Math.max(0, l.life / 0.2);
    ctx.strokeStyle = '#fde047';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < l.segs.length - 1; i++) {
      const a = l.segs[i];
      const b = l.segs[i + 1];
      const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 14;
      const my = (a.y + b.y) / 2 + (Math.random() - 0.5) * 14;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(mx, my);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  // shop purchase absorb effect
  if (state.absorb) {
    const ab = state.absorb;
    const t = Math.min(1, ab.t / 0.6);
    const y = p.y - 42 + t * 36;
    const r = 11 * (1 - t * 0.7);
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.4;
    ctx.shadowColor = ab.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = ab.color;
    ctx.beginPath();
    ctx.arc(p.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ab.color;
    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2 + t * 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // camera

  // descend transition
  if (state.transition) {
    const t = state.transition.t;
    if (t > 0.5) {
      const k = Math.min(1, (t - 0.5) / 0.5);
      ctx.save();
      ctx.translate(WIDTH / 2, HEIGHT / 2);
      ctx.rotate(k * Math.PI * 3);
      for (let i = 0; i < 7; i++) {
        ctx.rotate((Math.PI * 2) / 7);
        ctx.strokeStyle = `rgba(167,139,250,${0.35 * (1 - k * 0.5)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 60 + i * 45 + k * 180, 0, Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = `rgba(2,6,23,${k})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  // room cleared banner
  if (state.clearDelay) {
    const a = Math.min(1, state.clearDelay.t / 0.3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, HEIGHT / 2 - 46, WIDTH, 92);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('⚔️ Room Cleared! ⚔️', WIDTH / 2, HEIGHT / 2 - 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '15px sans-serif';
    ctx.fillText('Descending to the shop…', WIDTH / 2, HEIGHT / 2 + 22);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // low-health vignette
  if (p.hp > 0 && p.hp / p.maxHp < 0.25) {
    const a = 0.18 + (0.5 + Math.sin(state.slimeBob * 2.5) * 0.5) * 0.32;
    const g = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.2, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.75);
    g.addColorStop(0, 'rgba(127,0,0,0)');
    g.addColorStop(1, `rgba(220,38,38,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}
