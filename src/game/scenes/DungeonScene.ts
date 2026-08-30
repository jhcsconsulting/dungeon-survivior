import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ensureTextures } from '../textures';
import { runState, resetRun } from '../state/RunState';
import { buildWave } from '../data/waves';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

const WALL = 24;
const PROJECTILE_SPEED = 210;

export class DungeonScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private door?: Phaser.Physics.Arcade.Image;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hpBar!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private roomCleared = false;

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    ensureTextures(this);
    this.gameOver = false;
    this.roomCleared = false;
    this.door = undefined;

    this.drawRoom();
    this.physics.world.setBounds(WALL, WALL, GAME_WIDTH - WALL * 2, GAME_HEIGHT - WALL * 2);

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 90);
    this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: false });
    this.projectiles = this.physics.add.group();
    this.coins = this.physics.add.group();

    this.spawnWave();

    // Colliders and overlaps.
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      this.onPlayerTouched(e as Enemy);
    });
    this.physics.add.overlap(this.player, this.projectiles, (_p, proj) => {
      this.onProjectileHit(proj as Phaser.Physics.Arcade.Image);
    });
    this.physics.add.overlap(this.player, this.coins, (_p, coin) => {
      this.collectCoin(coin as Phaser.Physics.Arcade.Image);
    });

    // Input.
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys('W,A,S,D,SPACE') as DungeonScene['keys'];
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver) return;
      const dir = new Phaser.Math.Vector2(
        pointer.worldX - this.player.x,
        pointer.worldY - this.player.y,
      ).normalize();
      this.trySlash(dir);
    });

    this.createHud();
    this.cameras.main.setBackgroundColor(0x0b0b12);
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    // Movement input.
    const left = this.keys.A.isDown || this.cursors.left.isDown;
    const right = this.keys.D.isDown || this.cursors.right.isDown;
    const up = this.keys.W.isDown || this.cursors.up.isDown;
    const down = this.keys.S.isDown || this.cursors.down.isDown;
    const dir = new Phaser.Math.Vector2(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0),
    );
    if (dir.lengthSq() > 0) dir.normalize();
    this.player.move(dir.x, dir.y);
    this.player.tickCooldown(delta);

    if (this.keys.SPACE.isDown) {
      this.trySlash(this.player.facing.clone());
    }

    // Enemy AI.
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      if (enemy.updateAI(this.player, time, delta)) {
        this.fireProjectile(enemy);
      }
    }

    // Coins gently magnet toward the player when close.
    for (const obj of this.coins.getChildren()) {
      const coin = obj as Phaser.Physics.Arcade.Image;
      if (!coin.active) continue;
      const d = Phaser.Math.Distance.Between(coin.x, coin.y, this.player.x, this.player.y);
      if (d < 80) {
        this.physics.moveToObject(coin, this.player, 300);
      }
    }
  }

  // --- Room ---

  private drawRoom(): void {
    const g = this.add.graphics();
    // Floor: subtle checkered stone.
    const tile = 48;
    for (let x = WALL; x < GAME_WIDTH - WALL; x += tile) {
      for (let y = WALL; y < GAME_HEIGHT - WALL; y += tile) {
        const even = ((x / tile) | 0) % 2 === ((y / tile) | 0) % 2;
        g.fillStyle(even ? 0x1c1b26 : 0x201f2c, 1);
        g.fillRect(x, y, tile, tile);
      }
    }
    // Walls.
    g.fillStyle(0x3f3a4d, 1);
    g.fillRect(0, 0, GAME_WIDTH, WALL);
    g.fillRect(0, GAME_HEIGHT - WALL, GAME_WIDTH, WALL);
    g.fillRect(0, 0, WALL, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - WALL, 0, WALL, GAME_HEIGHT);
    g.lineStyle(2, 0x59526b, 1);
    g.strokeRect(WALL, WALL, GAME_WIDTH - WALL * 2, GAME_HEIGHT - WALL * 2);

    // Torches for atmosphere.
    for (const tx of [180, 480, 780]) {
      const torch = this.add.circle(tx, WALL / 2 + 4, 5, 0xf59e0b).setDepth(5);
      this.tweens.add({
        targets: torch,
        alpha: { from: 1, to: 0.5 },
        scale: { from: 1, to: 1.35 },
        duration: 300 + Math.random() * 250,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  // --- Wave spawning ---

  private spawnWave(): void {
    const spawns = buildWave(runState.round);
    for (const spawn of spawns) {
      const pos = this.pickSpawnPoint();
      const enemy = new Enemy(this, pos.x, pos.y, spawn.kind, runState.round);
      this.enemies.add(enemy);
    }
  }

  /** Random point near the room edges, away from the player spawn. */
  private pickSpawnPoint(): Phaser.Math.Vector2 {
    const margin = WALL + 40;
    for (let i = 0; i < 30; i++) {
      const side = Phaser.Math.Between(0, 3);
      let x: number;
      let y: number;
      if (side === 0) {
        x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
        y = margin;
      } else if (side === 1) {
        x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
        y = GAME_HEIGHT - margin;
      } else if (side === 2) {
        x = margin;
        y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      } else {
        x = GAME_WIDTH - margin;
        y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      }
      if (Phaser.Math.Distance.Between(x, y, GAME_WIDTH / 2, GAME_HEIGHT - 90) > 180) {
        return new Phaser.Math.Vector2(x, y);
      }
    }
    return new Phaser.Math.Vector2(WALL + 60, WALL + 60);
  }

  // --- Combat ---

  private trySlash(dir: Phaser.Math.Vector2): void {
    if (!this.player.canAttack() || this.gameOver) return;
    this.player.startAttackCooldown();
    if (dir.lengthSq() === 0) dir.set(1, 0);

    const range = runState.swordRange;
    const angle = Math.atan2(dir.y, dir.x);
    const hitX = this.player.x + dir.x * range * 0.7;
    const hitY = this.player.y + dir.y * range * 0.7;

    // Visual swoosh.
    const slash = this.add
      .image(this.player.x, this.player.y, 'slash')
      .setRotation(angle)
      .setScale(range / 56)
      .setDepth(20)
      .setAlpha(0.9);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: (range / 56) * 1.15,
      duration: 140,
      onComplete: () => slash.destroy(),
    });

    // Damage every enemy inside the swing radius.
    const time = this.time.now;
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      const d = Phaser.Math.Distance.Between(hitX, hitY, enemy.x, enemy.y);
      if (d <= range * 0.75 + enemy.stats.radius) {
        this.showDamageNumber(enemy.x, enemy.y - 18, runState.damage);
        if (enemy.takeDamage(runState.damage, this.player.x, this.player.y, time)) {
          this.killEnemy(enemy);
        }
      }
    }
  }

  private killEnemy(enemy: Enemy): void {
    const { x, y } = enemy;
    const drops = Phaser.Math.Between(enemy.stats.coinsMin, enemy.stats.coinsMax);

    // Remove from the group immediately so the clear check is exact;
    // the object sticks around only for its death animation.
    this.enemies.remove(enemy);
    enemy.disableBody();
    this.tweens.add({
      targets: enemy,
      scaleX: 1.4,
      scaleY: 0.1,
      alpha: 0,
      duration: 160,
      onComplete: () => enemy.destroy(),
    });

    for (let i = 0; i < drops; i++) {
      const coin = this.coins.create(x, y, 'coin') as Phaser.Physics.Arcade.Image;
      coin.setDepth(8);
      const scatter = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(12, 42);
      this.tweens.add({
        targets: coin,
        x: x + Math.cos(scatter) * dist,
        y: y + Math.sin(scatter) * dist,
        duration: 220,
        ease: 'Cubic.out',
      });
    }

    this.checkRoomCleared();
  }

  private checkRoomCleared(): void {
    if (this.roomCleared || this.gameOver) return;
    if (this.enemies.countActive(true) > 0) return;
    this.roomCleared = true;
    this.spawnDoor();
  }

  private spawnDoor(): void {
    this.door = this.physics.add.staticImage(GAME_WIDTH / 2, WALL + 30, 'door') as
      unknown as Phaser.Physics.Arcade.Image;
    this.door.setDepth(6).setAlpha(0);
    this.tweens.add({ targets: this.door, alpha: 1, duration: 400 });
    this.tweens.add({
      targets: this.door,
      scale: { from: 1, to: 1.06 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const hint = this.add
      .text(GAME_WIDTH / 2, WALL + 78, 'Room clear! Enter the door', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#86efac',
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });

    this.physics.add.overlap(this.player, this.door, () => {
      if (this.gameOver) return;
      this.gameOver = true; // block further updates during transition
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('ShopScene'));
    });
  }

  private fireProjectile(enemy: Enemy): void {
    const proj = this.projectiles.create(enemy.x, enemy.y, 'projectile') as
      Phaser.Physics.Arcade.Image;
    proj.setDepth(15);
    const body = proj.body as Phaser.Physics.Arcade.Body;
    body.setCircle(5, 2, 2);
    this.physics.moveToObject(proj, this.player, PROJECTILE_SPEED);
    // Projectiles expire on their own so strays don't pile up.
    this.time.delayedCall(4000, () => {
      if (proj.active) proj.destroy();
    });
  }

  private onPlayerTouched(enemy: Enemy): void {
    this.damagePlayer(enemy.stats.contactDamage, enemy.x, enemy.y);
  }

  private onProjectileHit(proj: Phaser.Physics.Arcade.Image): void {
    if (!proj.active) return;
    const fromX = proj.x;
    const fromY = proj.y;
    proj.destroy();
    this.damagePlayer(8 + Math.round(2 * runState.round), fromX, fromY);
  }

  private damagePlayer(amount: number, fromX: number, fromY: number): void {
    if (this.gameOver) return;
    const time = this.time.now;
    if (this.player.isInvulnerable(time)) return;
    const died = this.player.hurt(amount, time, fromX, fromY);
    this.cameras.main.shake(120, 0.004);
    this.updateHud();
    if (died) this.onGameOver();
  }

  private collectCoin(coin: Phaser.Physics.Arcade.Image): void {
    if (!coin.active) return;
    coin.destroy();
    runState.coins += 1;
    this.updateHud();
  }

  private showDamageNumber(x: number, y: number, amount: number): void {
    const label = this.add
      .text(x, y, `${amount}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#fef08a',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: label,
      y: y - 26,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.out',
      onComplete: () => label.destroy(),
    });
  }

  // --- HUD ---

  private createHud(): void {
    this.hpBar = this.add.graphics().setDepth(100);
    this.coinText = this.add
      .text(GAME_WIDTH - 40, 38, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#fbbf24',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0.5)
      .setDepth(100);
    this.add.image(GAME_WIDTH - 28, 38, 'coin').setDepth(100).setScale(1.4);
    this.roundText = this.add
      .text(GAME_WIDTH / 2, 38, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#e2e8f0',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.updateHud();
  }

  private updateHud(): void {
    const barX = 36;
    const barY = 30;
    const barW = 220;
    const barH = 18;
    const frac = Phaser.Math.Clamp(runState.hp / runState.maxHp, 0, 1);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.6);
    this.hpBar.fillRoundedRect(barX - 3, barY - 3, barW + 6, barH + 6, 6);
    this.hpBar.fillStyle(0x7f1d1d, 1);
    this.hpBar.fillRoundedRect(barX, barY, barW, barH, 4);
    if (frac > 0) {
      this.hpBar.fillStyle(frac > 0.35 ? 0x22c55e : 0xef4444, 1);
      this.hpBar.fillRoundedRect(barX, barY, Math.max(barW * frac, 8), barH, 4);
    }
    this.coinText.setText(`${runState.coins}`);
    this.roundText.setText(`Round ${runState.round}`);
  }

  // --- Game over ---

  private onGameOver(): void {
    this.gameOver = true;
    this.physics.pause();
    this.tweens.killTweensOf(this.player);
    this.player.clearTint();
    this.tweens.add({
      targets: this.player,
      scaleX: 1.6,
      scaleY: 0.08,
      alpha: 0,
      duration: 450,
    });

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
      .setDepth(200);
    this.add
      .text(cx, cy - 60, 'YOU DISSOLVED', {
        fontFamily: 'Georgia, serif',
        fontSize: '52px',
        color: '#ef4444',
        stroke: '#450a0a',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(201);
    this.add
      .text(cx, cy + 6, `Reached round ${runState.round}  ·  ${runState.coins} coins`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
      .setDepth(201);
    const back = this.add
      .text(cx, cy + 70, '— Click to return to the menu —', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setDepth(201);
    this.tweens.add({ targets: back, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    this.time.delayedCall(600, () => {
      this.input.once('pointerdown', () => {
        resetRun();
        this.scene.start('MenuScene');
      });
    });
  }
}
