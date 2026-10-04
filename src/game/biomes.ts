import { seededRandom } from './random';

export interface Biome {
  name: string;
  floor1: string;
  floor2: string;
  grid: string;
  wall: string;
  accent: string;
  particle: string;
}

export const BIOMES: Biome[] = [
  {
    name: 'Stone Dungeon',
    floor1: '#1e1b2e',
    floor2: '#2a2440',
    grid: 'rgba(139,92,246,0.08)',
    wall: '#4c1d95',
    accent: '#f59e0b',
    particle: '#fbbf24',
  },
  {
    name: 'Mossy Cave',
    floor1: '#0f1f1a',
    floor2: '#14302a',
    grid: 'rgba(52,211,153,0.08)',
    wall: '#065f46',
    accent: '#34d399',
    particle: '#a7f3d0',
  },
  {
    name: 'Lava Cavern',
    floor1: '#1f0e0a',
    floor2: '#3a1a10',
    grid: 'rgba(248,113,113,0.10)',
    wall: '#7c2d12',
    accent: '#fb923c',
    particle: '#f97316',
  },
  {
    name: 'Ice Crypt',
    floor1: '#0b1226',
    floor2: '#13243f',
    grid: 'rgba(96,165,250,0.10)',
    wall: '#1e3a8a',
    accent: '#67e8f9',
    particle: '#e0f2fe',
  },
  {
    name: 'Arcane Ruins',
    floor1: '#1a1033',
    floor2: '#2a1a4a',
    grid: 'rgba(236,72,153,0.10)',
    wall: '#6d28d9',
    accent: '#f0abfc',
    particle: '#f0abfc',
  },
];

/** Biomes rotate every 3 rounds. */
export function biomeIndexForRound(round: number): number {
  return Math.floor((round - 1) / 3) % BIOMES.length;
}

export function biomeNameForRound(round: number): string {
  return BIOMES[biomeIndexForRound(round)].name;
}

type Ctx = CanvasRenderingContext2D;

function drawTorch(ctx: Ctx, x: number, y: number, t: number, color: string, down: boolean) {
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(x - 2, y - 6, 4, 10);
  const flicker = Math.sin(t * 12 + x) * 1.5 + Math.sin(t * 29 + x) * 0.8;
  const fy = down ? y + 6 : y - 8;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  const grad = ctx.createRadialGradient(x, fy, 1, x, fy, 9);
  grad.addColorStop(0, '#fde68a');
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, fy + flicker * 0.3, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMushroom(ctx: Ctx, x: number, y: number, size: number, color: string, t: number) {
  ctx.fillStyle = '#e7e5e4';
  ctx.fillRect(x - 1, y, 2, size);
  const pulse = 0.85 + Math.sin(t * 2 + x) * 0.15;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, size * pulse, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrystal(ctx: Ctx, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.6, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.6, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.25, y - size * 0.3);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

function drawRune(ctx: Ctx, x: number, y: number, size: number, color: string, t: number) {
  ctx.save();
  ctx.globalAlpha = 0.4 + Math.sin(t * 1.5 + x) * 0.2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.translate(x, y);
  ctx.rotate(t * 0.5 + x);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const px = Math.cos(a) * size * 0.7;
    const py = Math.sin(a) * size * 0.7;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawDecorations(
  ctx: Ctx,
  w: number,
  h: number,
  biome: Biome,
  biomeIndex: number,
  rand: () => number,
  t: number,
) {
  const torches: { x: number; y: number; down: boolean }[] = [];
  for (let x = 80; x < w - 60; x += 160) {
    torches.push({ x, y: 14, down: true });
    torches.push({ x: x + 80, y: h - 14, down: false });
  }
  if (biomeIndex === 0) {
    torches.forEach((tc) => drawTorch(ctx, tc.x, tc.y, t, biome.accent, tc.down));
  } else if (biomeIndex === 1) {
    for (let i = 0; i < 14; i++) {
      const x = rand() * (w - 40) + 20;
      const y = rand() * (h - 40) + 20;
      drawMushroom(ctx, x, y, 6 + rand() * 6, biome.accent, t + i);
    }
    torches.forEach((tc) => drawTorch(ctx, tc.x, tc.y, t, '#a3e635', tc.down));
  } else if (biomeIndex === 2) {
    ctx.strokeStyle = 'rgba(251,146,60,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      let x = rand() * w;
      let y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (rand() - 0.5) * 60;
        y += (rand() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(249,115,22,0.35)';
    for (let i = 0; i < 3; i++) {
      const x = rand() * w;
      ctx.beginPath();
      ctx.ellipse(x, h - 10, 40 + rand() * 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (biomeIndex === 3) {
    for (let i = 0; i < 16; i++) {
      const x = rand() * (w - 40) + 20;
      const y = rand() * (h - 40) + 20;
      drawCrystal(ctx, x, y, 5 + rand() * 8, biome.accent);
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const x = rand() * (w - 80) + 40;
      const y = rand() * (h - 80) + 40;
      drawRune(ctx, x, y, 16 + rand() * 14, biome.accent, t + i);
    }
    torches.forEach((tc) => drawTorch(ctx, tc.x, tc.y, t, biome.accent, tc.down));
  }
}

function drawAmbientParticles(ctx: Ctx, w: number, h: number, biome: Biome, biomeIndex: number, t: number) {
  const rand = seededRandom(biomeIndex * 7919 + 13);
  const motes: { x: number; y0: number; sp: number; sz: number; ph: number }[] = [];
  for (let i = 0; i < 28; i++) {
    motes.push({ x: rand() * w, y0: rand() * h, sp: 10 + rand() * 30, sz: 1 + rand() * 1.8, ph: rand() * 10 });
  }
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = biome.particle;
  for (const m of motes) {
    let y: number;
    if (biomeIndex === 2) y = (((m.y0 - t * m.sp) % h) + h) % h; // embers rise
    else if (biomeIndex === 3) y = (((m.y0 + t * m.sp * 0.6) % h) + h) % h; // snow falls
    else y = (((m.y0 + t * m.sp * 0.3) % h) + h) % h;
    const x = (((m.x + Math.sin(t * 0.5 + m.ph) * 12) % w) + w) % w;
    ctx.beginPath();
    ctx.arc(x, y, m.sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Paints the full dungeon floor for a round: gradient floor, grid, walls, biome decorations, vignette. */
export function drawBackground(ctx: Ctx, w: number, h: number, round: number, t: number) {
  const biomeIndex = biomeIndexForRound(round);
  const biome = BIOMES[biomeIndex];
  const rand = seededRandom(round * 9999 + 7);

  const floor = ctx.createLinearGradient(0, 0, 0, h);
  floor.addColorStop(0, biome.floor2);
  floor.addColorStop(1, biome.floor1);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = biome.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = biome.wall;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  drawDecorations(ctx, w, h, biome, biomeIndex, rand, t);
  drawAmbientParticles(ctx, w, h, biome, biomeIndex, t);

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
