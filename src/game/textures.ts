import Phaser from 'phaser';

/**
 * All art is generated procedurally so the game has zero asset files.
 * Safe to call from every scene; only generates once.
 */
export function ensureTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('slime')) return;
  const g = scene.add.graphics();

  // --- Player slime ---
  g.clear();
  g.fillStyle(0x22c55e, 1);
  g.fillEllipse(24, 28, 44, 26); // squishy base
  g.fillStyle(0x4ade80, 1);
  g.fillEllipse(24, 20, 38, 28); // body dome
  g.fillStyle(0xffffff, 0.45);
  g.fillEllipse(15, 12, 12, 7); // glossy highlight
  g.fillStyle(0x14532d, 1);
  g.fillCircle(17, 20, 4.2); // eyes
  g.fillCircle(31, 20, 4.2);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(18.5, 18.5, 1.5);
  g.fillCircle(32.5, 18.5, 1.5);
  g.lineStyle(2, 0x14532d, 1);
  g.beginPath();
  g.arc(24, 27, 4, 0.2, Math.PI - 0.2); // smile
  g.strokePath();
  g.generateTexture('slime', 48, 42);

  // --- Chaser: small angry red blob ---
  g.clear();
  g.fillStyle(0xb91c1c, 1);
  g.fillEllipse(16, 20, 28, 18);
  g.fillStyle(0xef4444, 1);
  g.fillEllipse(16, 15, 26, 20);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(10, 9, 8, 5);
  g.fillStyle(0x450a0a, 1);
  g.fillCircle(11, 15, 3);
  g.fillCircle(21, 15, 3);
  g.lineStyle(2, 0x450a0a, 1);
  g.lineBetween(7, 10, 14, 13); // angry brows
  g.lineBetween(25, 10, 18, 13);
  g.generateTexture('chaser', 32, 30);

  // --- Shooter: purple one-eyed caster ---
  g.clear();
  g.fillStyle(0x7c3aed, 1);
  g.fillEllipse(15, 21, 26, 16);
  g.fillStyle(0xa78bfa, 1);
  g.fillEllipse(15, 15, 24, 20);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(15, 14, 6.5); // big single eye
  g.fillStyle(0x4c1d95, 1);
  g.fillCircle(15, 14, 3.2);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(16.5, 12.5, 1.2);
  g.generateTexture('shooter', 30, 32);

  // --- Tank: big slow rock golem ---
  g.clear();
  g.fillStyle(0x57534e, 1);
  g.fillRoundedRect(3, 8, 42, 36, 13);
  g.fillStyle(0x78716c, 1);
  g.fillRoundedRect(5, 6, 38, 32, 12);
  g.lineStyle(2, 0x44403c, 1);
  g.lineBetween(14, 30, 20, 38); // cracks
  g.lineBetween(30, 12, 34, 20);
  g.fillStyle(0xfbbf24, 1);
  g.fillCircle(17, 20, 3); // glowing eyes
  g.fillCircle(31, 20, 3);
  g.generateTexture('tank', 48, 48);

  // --- Coin ---
  g.clear();
  g.fillStyle(0xb45309, 1);
  g.fillCircle(7, 8, 6);
  g.fillStyle(0xfbbf24, 1);
  g.fillCircle(7, 7, 6);
  g.fillStyle(0xfde68a, 1);
  g.fillCircle(5.5, 5.5, 2);
  g.generateTexture('coin', 14, 15);

  // --- Enemy projectile ---
  g.clear();
  g.fillStyle(0xc084fc, 0.4);
  g.fillCircle(7, 7, 7);
  g.fillStyle(0xc084fc, 1);
  g.fillCircle(7, 7, 4.5);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(7, 7, 2);
  g.generateTexture('projectile', 14, 14);

  // --- Sword slash arc (rotated + scaled at use site) ---
  g.clear();
  const cx = 64;
  const cy = 64;
  const arcs: Array<[number, number, number]> = [
    [56, 11, 0.95],
    [45, 9, 0.6],
    [35, 7, 0.3],
  ];
  for (const [radius, width, alpha] of arcs) {
    g.lineStyle(width, 0xe2f0ff, alpha);
    g.beginPath();
    g.arc(cx, cy, radius, -Math.PI / 4, Math.PI / 4);
    g.strokePath();
  }
  g.generateTexture('slash', 128, 128);

  // --- Exit door ---
  g.clear();
  g.fillStyle(0x854d0e, 1);
  g.fillRoundedRect(2, 4, 44, 60, { tl: 20, tr: 20, bl: 4, br: 4 });
  g.fillStyle(0x0c0a09, 1);
  g.fillRoundedRect(8, 12, 32, 52, { tl: 14, tr: 14, bl: 2, br: 2 });
  g.fillStyle(0x86efac, 0.25);
  g.fillRoundedRect(8, 12, 32, 52, { tl: 14, tr: 14, bl: 2, br: 2 });
  g.fillStyle(0xfbbf24, 1);
  g.fillCircle(37, 40, 2.5);
  g.generateTexture('door', 48, 66);

  g.destroy();
}
