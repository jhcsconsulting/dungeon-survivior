import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ensureTextures } from '../textures';
import { resetRun } from '../state/RunState';
import { startBackgroundMusic } from '../backgroundMusic';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    ensureTextures(this);
    const cx = GAME_WIDTH / 2;
    this.drawBackdrop();
    this.add.rectangle(cx, 165, 376, 166, 0x2c2927, 0.92).setStrokeStyle(2, 0x514a45);

    this.add
      .text(cx, 130, 'SLIME DUNGEON', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '48px',
        color: '#73ef96',
        stroke: '#39ad73',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 190, 'SURVIVOR', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '24px',
        color: '#f3c56b',
        stroke: '#78350f',
        strokeThickness: 2,
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

    const guideBot = this.add.image(846, 292, 'minion').setScale(2).setTint(0x67e8f9);
    this.tweens.add({
      targets: guideBot,
      y: { from: 292, to: 282 },
      angle: { from: -4, to: 4 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.add
      .text(846, 330, 'GUIDE BOT', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#67e8f9',
      })
      .setOrigin(0.5);
    const guideBubble = this.add
      .rectangle(714, 230, 214, 92, 0x082f49, 0.95)
      .setStrokeStyle(2, 0x22d3ee, 0.9);
    const guideText = this.add
      .text(714, 230, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#cffafe',
        align: 'center',
        wordWrap: { width: 220 },
      })
      .setOrigin(0.5);
    const guideTips = [
      'Move with WASD or the arrow keys. Stay mobile!',
      'Press SPACE or click toward an enemy to slash.',
      'Collect coins, then buy upgrades in the marketplace.',
      'Endless World gives a random upgrade every few kills.',
    ];
    let guideTipIndex = 0;
    guideText.setText(guideTips[guideTipIndex]);
    const advanceGuide = () => {
      guideTipIndex = (guideTipIndex + 1) % guideTips.length;
      guideText.setText(guideTips[guideTipIndex]);
      this.tweens.add({ targets: guideBubble, scale: 1.04, duration: 90, yoyo: true });
    };
    this.add
      .zone(846, 292, 70, 90)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', advanceGuide);
    guideBubble.setInteractive({ useHandCursor: true }).on('pointerdown', advanceGuide);

    this.add
      .text(cx, 382, 'WASD / arrows to move  ·  Space or click to slash', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 412, 'Choose a run: clear rooms or roam an endless world.', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#64748b',
      })
      .setOrigin(0.5);

    const dungeon = this.add
      .text(cx - 145, GAME_HEIGHT - 42, 'Classic Run', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#dcfce7',
      })
      .setOrigin(0.5);
    const endless = this.add
      .text(cx + 145, GAME_HEIGHT - 42, 'Endless World', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#fef08a',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: [dungeon, endless], alpha: 0.45, duration: 650, yoyo: true, repeat: -1 });

    const start = (mode: 'dungeon' | 'endless') => {
      startBackgroundMusic();
      resetRun(mode);
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('DungeonScene'));
    };
    this.add
      .zone(cx - 145, GAME_HEIGHT - 42, 260, 50)
      .setInteractive({ useHandCursor: true })
      .once('pointerdown', () => start('dungeon'));
    this.add
      .zone(cx + 145, GAME_HEIGHT - 42, 260, 50)
      .setInteractive({ useHandCursor: true })
      .once('pointerdown', () => start('endless'));

    this.cameras.main.setBackgroundColor(0x0b0b12);
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private drawBackdrop(): void {
    const g = this.add.graphics();
    g.fillStyle(0x171717, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let y = 0; y < GAME_HEIGHT; y += 44) {
      const offset = (y / 44) % 2 === 0 ? 0 : 42;
      for (let x = -offset; x < GAME_WIDTH; x += 84) {
        g.fillStyle(0x252525, 1);
        g.fillRect(x + 1, y + 1, 82, 42);
        g.lineStyle(1, 0x0e0e0e, 0.8);
        g.strokeRect(x + 1, y + 1, 82, 42);
      }
    }
    g.fillStyle(0x070707, 0.46);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (const x of [52, GAME_WIDTH - 52]) {
      g.fillStyle(0x655847, 1);
      g.fillRoundedRect(x - 5, 160, 10, 48, 4);
      g.fillStyle(0xffc34d, 1);
      g.fillRoundedRect(x - 12, 184, 24, 38, 10);
      g.fillStyle(0xfff0a3, 0.9);
      g.fillRoundedRect(x - 6, 190, 12, 24, 5);
    }
  }
}
