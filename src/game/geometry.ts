import type { Obstacle, Vec } from './types';

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Push a circle (cx, cy, radius) out of an axis-aligned rectangle. Returns the corrected center. */
export function pushCircleOutOfRect(cx: number, cy: number, radius: number, rect: Obstacle): Vec {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  const dist = Math.hypot(dx, dy);
  if (dist > 0 && dist < radius) {
    const push = radius - dist;
    return { x: cx + (dx / dist) * push, y: cy + (dy / dist) * push };
  }
  if (dist === 0) {
    // Center is inside the rect: eject through the nearest face.
    const left = cx - rect.x;
    const right = rect.x + rect.w - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.h - cy;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: rect.x - radius, y: cy };
    if (min === right) return { x: rect.x + rect.w + radius, y: cy };
    if (min === top) return { x: cx, y: rect.y - radius };
    return { x: cx, y: rect.y + rect.h + radius };
  }
  return { x: cx, y: cy };
}
