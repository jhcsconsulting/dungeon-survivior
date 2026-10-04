import { CHUNK_SIZE } from './constants';
import { hashCoords, seededRandom } from './random';
import type { Obstacle } from './types';

/** Deterministic obstacles for one endless-mode chunk. */
function chunkObstacles(cx: number, cy: number): Obstacle[] {
  const rand = seededRandom(hashCoords(cx, cy));
  const out: Obstacle[] = [];
  const count = Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const isLog = rand() < 0.55;
    const w = isLog ? 72 + rand() * 48 : 40 + rand() * 30;
    const h = isLog ? 26 + rand() * 12 : 40 + rand() * 30;
    out.push({
      x: cx * CHUNK_SIZE + rand() * (CHUNK_SIZE - w),
      y: cy * CHUNK_SIZE + rand() * (CHUNK_SIZE - h),
      w,
      h,
      kind: isLog ? 'log' : 'stone',
    });
  }
  return out;
}

/** All obstacles overlapping the camera view (x, y, w, h) plus a margin. */
export function obstaclesInView(x: number, y: number, w: number, h: number): Obstacle[] {
  const x0 = Math.floor((x - 60) / CHUNK_SIZE);
  const x1 = Math.floor((x + w + 60) / CHUNK_SIZE);
  const y0 = Math.floor((y - 60) / CHUNK_SIZE);
  const y1 = Math.floor((y + h + 60) / CHUNK_SIZE);
  const out: Obstacle[] = [];
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      out.push(...chunkObstacles(cx, cy));
    }
  }
  return out;
}
