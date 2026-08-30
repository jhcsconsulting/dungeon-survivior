import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { ensureTextures } from '../textures';
import { resetRun } from '../state/RunState';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    ensureTextures(this);
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 130, 'SLIME DUNGEON', {
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        color: '#4ade80',
        stroke: '#14532d',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 190, 'SURVIVOR', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: '#fbbf24',
        stroke: '#78350f',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const slime = this.add.image(cx, 300, 'slime').setScale(3);
    this.tweens.add({
      targets: slime,
      scaleX: { from: 3, to: 3.25 },
      scaleY: { from: 3, to: 2.75 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.add
      .text(cx, 400, 'WASD / arrows to move  ·  Space or click to slash', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 430, 'Clear the room, grab the coins, shop, repeat.', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#64748b',
      })
      .setOrigin(0.5);

    const start = this.add
      .text(cx, 490, '— Click to Start —', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.4, duration: 650, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => {
      resetRun();
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('DungeonScene'));
    });

    this.cameras.main.setBackgroundColor(0x0b0b12);
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }
}
