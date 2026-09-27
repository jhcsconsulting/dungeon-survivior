import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ensureTextures } from '../textures';
import { runState } from '../state/RunState';
import { UPGRADES, Upgrade, priceFor } from '../data/upgrades';

interface Card {
  upgrade: Upgrade;
  bg: Phaser.GameObjects.Graphics;
  priceText: Phaser.GameObjects.Text;
  ownedText: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  x: number;
  y: number;
}

const CARD_W = 216;
const CARD_H = 82;

export class ShopScene extends Phaser.Scene {
  private cards: Card[] = [];
  private coinText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private slime!: Phaser.Physics.Arcade.Image;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    ensureTextures(this);
    this.cards = [];
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x141220);
    this.add.rectangle(cx, 42, GAME_WIDTH, 84, 0x2a1f14);
    this.add
      .text(cx, 32, 'MARKETPLACE', {
        fontFamily: 'Georgia, serif',
        fontSize: '36px',
        color: '#fbbf24',
        stroke: '#78350f',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 66, `Round ${runState.round} cleared — spend your loot, slime`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#d6b98c',
      })
      .setOrigin(0.5);

    // Coin balance.
    this.add.image(GAME_WIDTH - 130, 34, 'coin').setScale(1.6);
    this.coinText = this.add
      .text(GAME_WIDTH - 116, 34, '', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#fbbf24',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5);

    // Shopkeeper slime.
    const keeper = this.add.image(70, 44, 'slime').setScale(1.5).setTint(0x93c5fd);
    this.tweens.add({
      targets: keeper,
      scaleY: { from: 1.5, to: 1.35 },
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Upgrade cards, 4 x 3 grid.
    const gridLeft = cx - (CARD_W * 4 + 12 * 3) / 2;
    const gridTop = 122;
    UPGRADES.forEach((upgrade, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = gridLeft + col * (CARD_W + 12);
      const y = gridTop + row * (CARD_H + 14);
      this.createCard(upgrade, x, y);
    });

    // Keep the playable slime in a clear lane beneath the upgrade cards.
    this.slime = this.physics.add.image(cx, GAME_HEIGHT - 126, 'slime');
    this.slime.setScale(1.25).setDepth(10);
    this.slime.setCollideWorldBounds(true);
    this.slime.setDrag(1200, 1200);
    this.slime.setMaxVelocity(220, 220);
    this.add
      .text(cx, GAME_HEIGHT - 163, 'Move your slime', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#86efac',
      })
      .setOrigin(0.5)
      .setDepth(10);
    const lane = this.add.rectangle(cx, GAME_HEIGHT - 104, GAME_WIDTH - 72, 92, 0x0f2b25, 0.65);
    lane.setStrokeStyle(2, 0x166534, 0.8).setDepth(1);
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as ShopScene['keys'];

    // Current stats.
    this.statsText = this.add
      .text(cx, GAME_HEIGHT - 100, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    // Continue button.
    const btn = this.add.graphics();
    btn.fillStyle(0x166534, 1);
    btn.fillRoundedRect(cx - 130, GAME_HEIGHT - 72, 260, 46, 10);
    btn.lineStyle(2, 0x4ade80, 1);
    btn.strokeRoundedRect(cx - 130, GAME_HEIGHT - 72, 260, 46, 10);
    const btnLabel = this.add
      .text(cx, GAME_HEIGHT - 49, 'Enter next dungeon ▶', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#dcfce7',
      })
      .setOrigin(0.5);
    const btnZone = this.add
      .zone(cx, GAME_HEIGHT - 49, 260, 46)
      .setInteractive({ useHandCursor: true });
    btnZone.on('pointerover', () => btnLabel.setColor('#ffffff'));
    btnZone.on('pointerout', () => btnLabel.setColor('#dcfce7'));
    btnZone.on('pointerdown', () => {
      runState.round += 1;
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('DungeonScene'));
    });

    this.refresh();
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update(): void {
    if (!this.slime?.active) return;
    const left = this.keys.A.isDown;
    const right = this.keys.D.isDown;
    const up = this.keys.W.isDown;
    const down = this.keys.S.isDown;
    const body = this.slime.body as Phaser.Physics.Arcade.Body;
    const direction = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
    if (direction.lengthSq() > 0) {
      direction.normalize();
      body.setVelocity(direction.x * 180, direction.y * 180);
    } else {
      body.setVelocity(0, 0);
    }
    this.slime.x = Phaser.Math.Clamp(this.slime.x, 48, GAME_WIDTH - 48);
    this.slime.y = Phaser.Math.Clamp(this.slime.y, GAME_HEIGHT - 145, GAME_HEIGHT - 70);
  }

  private createCard(upgrade: Upgrade, x: number, y: number): void {
    const bg = this.add.graphics();
    this.add
      .text(x + 14, y + 9, upgrade.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '19px',
        color: '#f1f5f9',
      });
    this.add
      .text(x + 14, y + 32, upgrade.description, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#94a3b8',
        wordWrap: { width: CARD_W - 28 },
      });
    this.add.image(x + 24, y + CARD_H - 17, 'coin');
    const priceText = this.add
      .text(x + 36, y + CARD_H - 17, '', {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#fbbf24',
      })
      .setOrigin(0, 0.5);
    const ownedText = this.add
      .text(x + CARD_W - 14, y + CARD_H - 17, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#64748b',
      })
      .setOrigin(1, 0.5);

    const zone = this.add
      .zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H)
      .setInteractive({ useHandCursor: true });
    const card: Card = { upgrade, bg, priceText, ownedText, zone, x, y };
    zone.on('pointerdown', () => this.buy(card));
    zone.on('pointerover', () => this.drawCardBg(card, true));
    zone.on('pointerout', () => this.drawCardBg(card, false));
    this.cards.push(card);
  }

  private buy(card: Card): void {
    const owned = runState.purchases[card.upgrade.id] ?? 0;
    if (card.upgrade.maxPurchases !== undefined && owned >= card.upgrade.maxPurchases) {
      this.cameras.main.shake(100, 0.003);
      return;
    }
    const price = priceFor(card.upgrade, runState.purchases);
    if (runState.coins < price) {
      this.cameras.main.shake(100, 0.003);
      return;
    }
    runState.coins -= price;
    runState.purchases[card.upgrade.id] = (runState.purchases[card.upgrade.id] ?? 0) + 1;
    card.upgrade.apply(runState);

    // Purchase feedback flash.
    const flash = this.add
      .rectangle(card.x + CARD_W / 2, card.y + CARD_H / 2, CARD_W, CARD_H, 0x4ade80, 0.35);
    this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

    const absorption = this.add
      .image(card.x + CARD_W / 2, card.y + CARD_H / 2, 'power-core')
      .setScale(0.55)
      .setDepth(30);
    this.tweens.add({
      targets: absorption,
      x: this.slime.x,
      y: this.slime.y,
      scale: 1.2,
      angle: 360,
      duration: 520,
      ease: 'Cubic.in',
      onComplete: () => {
        absorption.destroy();
        this.tweens.add({
          targets: this.slime,
          scaleX: 1.55,
          scaleY: 0.82,
          duration: 110,
          yoyo: true,
          ease: 'Sine.inOut',
        });
      },
    });

    this.refresh();
  }

  private drawCardBg(card: Card, hover: boolean): void {
    const price = priceFor(card.upgrade, runState.purchases);
    const owned = runState.purchases[card.upgrade.id] ?? 0;
    const capped = card.upgrade.maxPurchases !== undefined && owned >= card.upgrade.maxPurchases;
    const affordable = !capped && runState.coins >= price;
    card.bg.clear();
    card.bg.fillStyle(hover && affordable ? 0x2b2840 : capped ? 0x18201e : 0x1f1d30, 1);
    card.bg.fillRoundedRect(card.x, card.y, CARD_W, CARD_H, 10);
    card.bg.lineStyle(2, capped ? 0x166534 : affordable ? 0x6d28d9 : 0x3f3f46, 1);
    card.bg.strokeRoundedRect(card.x, card.y, CARD_W, CARD_H, 10);
  }

  private refresh(): void {
    this.coinText.setText(`${runState.coins}`);
    for (const card of this.cards) {
      const price = priceFor(card.upgrade, runState.purchases);
      const owned = runState.purchases[card.upgrade.id] ?? 0;
      const capped = card.upgrade.maxPurchases !== undefined && owned >= card.upgrade.maxPurchases;
      const affordable = !capped && runState.coins >= price;
      card.priceText.setText(capped ? 'MAX' : `${price}`).setColor(capped ? '#4ade80' : affordable ? '#fbbf24' : '#7f6a2a');
      card.ownedText.setText(owned > 0 ? `owned x${owned}${card.upgrade.maxPurchases ? `/${card.upgrade.maxPurchases}` : ''}` : '');
      this.drawCardBg(card, false);
    }
    this.statsText.setText(
      `HP ${runState.hp}/${runState.maxHp}   DMG ${runState.damage}   ` +
        `SPD ${runState.moveSpeed}   RANGE ${runState.swordRange}   ` +
      `${runState.attackSpeed.toFixed(1)} atk/s   ` +
      `AURA ${runState.radioactiveDamage}   BOTS ${runState.minions}`,
    );
  }
}
