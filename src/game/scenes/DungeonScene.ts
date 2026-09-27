import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { ensureTextures } from '../textures';
import { runState, resetRun } from '../state/RunState';
import { buildWave } from '../data/waves';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { UPGRADES, Upgrade } from '../data/upgrades';

const WALL = 24;
const PROJECTILE_SPEED = 210;

export class DungeonScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private arrows!: Phaser.Physics.Arcade.Group;
  private coins!: Phaser.Physics.Arcade.Group;
  private minionSprites: Phaser.GameObjects.Image[] = [];
  private aura?: Phaser.GameObjects.Arc;
  private worldFloor?: Phaser.GameObjects.TileSprite;
  private endlessUpgradeObjects: Phaser.GameObjects.GameObject[] = [];
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE' | 'SHIFT', Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private hpBar!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private arrowText!: Phaser.GameObjects.Text;
  private dashText!: Phaser.GameObjects.Text;
  private pauseButtonText!: Phaser.GameObjects.Text;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private gameOver = false;
  private paused = false;
  private roomCleared = false;
  private radioactiveTimer = 0;
  private flamethrowerTimer = 0;
  private endlessSpawnTimer = 0;
  private endlessUpgradeOpen = false;
  private arrowCooldown = 0;
  private dashCooldown = 0;
  private dashUntil = 0;
  private dashShieldUntil = 0;

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    ensureTextures(this);
    this.gameOver = false;
    this.paused = false;
    this.roomCleared = false;
    this.minionSprites = [];
    this.radioactiveTimer = 0;
    this.flamethrowerTimer = 0;
    this.endlessSpawnTimer = 1200;
    this.endlessUpgradeOpen = false;
    this.arrowCooldown = 0;
    this.dashCooldown = 0;
    this.dashUntil = 0;
    this.dashShieldUntil = 0;

    if (runState.mode === 'endless') this.drawEndlessWorld();
    else this.drawRoom();

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 90);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCollideWorldBounds(runState.mode === 'dungeon');
    if (runState.mode === 'endless') {
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    } else {
      this.physics.world.setBounds(WALL, WALL, GAME_WIDTH - WALL * 2, GAME_HEIGHT - WALL * 2);
    }
    this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: false });
    this.projectiles = this.physics.add.group();
    this.arrows = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.createMinions();
    if (runState.radioactiveRadius > 0) {
      this.aura = this.add
        .circle(this.player.x, this.player.y, runState.radioactiveRadius, 0x84cc16, 0.12)
        .setStrokeStyle(2, 0xa3e635, 0.6)
        .setDepth(4);
    }

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
    this.physics.add.overlap(this.arrows, this.enemies, (arrow, enemy) => {
      this.onArrowHit(arrow as Phaser.Physics.Arcade.Image, enemy as Enemy);
    });

    // Input.
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys('W,A,S,D,SPACE,SHIFT') as DungeonScene['keys'];
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver || this.paused) return;
      const dir = new Phaser.Math.Vector2(
        pointer.worldX - this.player.x,
        pointer.worldY - this.player.y,
      ).normalize();
      if (pointer.button === 2) this.fireArrow(dir);
      else this.trySlash(dir);
    });

    this.createHud();
    this.cameras.main.setBackgroundColor(0x0b0b12);
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update(time: number, delta: number): void {
    if (this.gameOver || this.paused || this.endlessUpgradeOpen) return;
    this.arrowCooldown = Math.max(0, this.arrowCooldown - delta);
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);

    if (runState.mode === 'endless') {
      this.endlessSpawnTimer -= delta;
      if (this.endlessSpawnTimer <= 0) {
        this.endlessSpawnTimer = Math.max(500, 1250 - runState.endlessKills * 2);
        if (this.enemies.countActive(true) < 12) this.spawnEndlessEnemy();
      }
      if (this.worldFloor) {
        this.worldFloor.tilePositionX = this.player.x;
        this.worldFloor.tilePositionY = this.player.y;
      }
    }

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
    if (time >= this.dashUntil) this.player.move(dir.x, dir.y);
    this.player.tickCooldown(delta);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) this.tryDash();

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

    this.updateMinions(time, delta);
    this.updateRadioactiveEssence(delta);
    this.updateFlamethrower(delta);
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
    if (runState.mode === 'endless') {
      for (let i = 0; i < 8; i++) this.spawnEndlessEnemy();
      return;
    }
    const spawns = buildWave(runState.round);
    for (const spawn of spawns) {
      const pos = this.pickSpawnPoint();
      const enemy = new Enemy(this, pos.x, pos.y, spawn.kind, runState.round);
      this.enemies.add(enemy);
    }
  }

  private spawnEndlessEnemy(): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(420, 520);
    const kind = buildWave(Math.max(1, Math.floor(runState.endlessKills / 12) + 1))[0].kind;
    const enemy = new Enemy(
      this,
      this.player.x + Math.cos(angle) * distance,
      this.player.y + Math.sin(angle) * distance,
      kind,
      Math.max(1, Math.floor(runState.endlessKills / 12) + 1),
    );
    this.enemies.add(enemy);
  }

  private drawEndlessWorld(): void {
    this.worldFloor = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'floor-tile')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-10);
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

  private fireArrow(dir: Phaser.Math.Vector2): void {
    if (!runState.bowOwned || runState.arrows <= 0 || this.arrowCooldown > 0) return;
    if (dir.lengthSq() === 0) dir.set(1, 0);
    dir.normalize();
    runState.arrows -= 1;
    this.arrowCooldown = 260;
    const arrow = this.arrows.create(this.player.x, this.player.y, 'arrow') as
      Phaser.Physics.Arcade.Image;
    arrow.setRotation(Math.atan2(dir.y, dir.x)).setDepth(16);
    const body = arrow.body as Phaser.Physics.Arcade.Body;
    body.setCircle(6, 10, 4);
    body.setVelocity(dir.x * 720, dir.y * 720);
    this.tweens.add({ targets: arrow, alpha: 0.65, duration: 180, yoyo: true, repeat: -1 });
    this.time.delayedCall(6000, () => {
      if (arrow.active) arrow.destroy();
    });
    this.updateHud();
  }

  private onArrowHit(arrow: Phaser.Physics.Arcade.Image, enemy: Enemy): void {
    if (!arrow.active || !enemy.active) return;
    arrow.destroy();
    this.showDamageNumber(enemy.x, enemy.y - 18, runState.bowDamage);
    if (enemy.takeDamage(runState.bowDamage, this.player.x, this.player.y, this.time.now)) {
      this.killEnemy(enemy);
    }
  }

  private tryDash(): void {
    if (this.dashCooldown > 0 || this.gameOver) return;
    const direction = this.player.facing.clone().normalize();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.dashCooldown = 1800;
    this.dashUntil = this.time.now + 180;
    this.dashShieldUntil = this.time.now + 700;
    body.setVelocity(direction.x * 720, direction.y * 720);

    const trail = this.add
      .image(this.player.x, this.player.y, 'slime')
      .setTint(0x93c5fd)
      .setAlpha(0.55)
      .setDepth(19);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 1.35,
      scaleY: 0.7,
      duration: 220,
      onComplete: () => trail.destroy(),
    });

    const hitX = this.player.x + direction.x * 58;
    const hitY = this.player.y + direction.y * 58;
    const damage = Math.round(runState.damage * 1.5);
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      if (Phaser.Math.Distance.Between(hitX, hitY, enemy.x, enemy.y) <= 62 + enemy.stats.radius) {
        this.showDamageNumber(enemy.x, enemy.y - 18, damage);
        if (enemy.takeDamage(damage, this.player.x, this.player.y, this.time.now)) this.killEnemy(enemy);
      }
    }
    this.updateHud();
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

    if (runState.mode === 'endless') this.handleEndlessKill();
    else this.checkRoomCleared();
  }

  private handleEndlessKill(): void {
    runState.endlessKills += 1;
    if (runState.endlessKills >= runState.endlessNextUpgrade) {
      runState.endlessNextUpgrade += 10 + Math.floor(runState.endlessKills / 20);
      this.offerEndlessUpgrade();
    }
    this.updateHud();
  }

  private offerEndlessUpgrade(): void {
    this.endlessUpgradeOpen = true;
    this.physics.pause();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panel = this.add
      .rectangle(cx, cy, 600, 250, 0x0b1220, 0.96)
      .setStrokeStyle(3, 0xa3e635, 0.9)
      .setScrollFactor(0)
      .setDepth(200);
    this.endlessUpgradeObjects.push(panel);
    const title = this.add
      .text(cx, cy - 92, 'ESSENCE SURGE', {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#bef264',
        stroke: '#365314',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);
    this.endlessUpgradeObjects.push(title);

    const available = UPGRADES.filter((upgrade) => {
      const owned = runState.purchases[upgrade.id] ?? 0;
      return upgrade.maxPurchases === undefined || owned < upgrade.maxPurchases;
    });
    const weighted = available.flatMap((upgrade) =>
      upgrade.id === 'heart-gel' ? [upgrade, upgrade, upgrade] : [upgrade],
    );
    const choices: Upgrade[] = [];
    for (const upgrade of Phaser.Utils.Array.Shuffle(weighted)) {
      if (choices.some((choice) => choice.id === upgrade.id)) continue;
      choices.push(upgrade);
      if (choices.length === 3) break;
    }
    choices.forEach((upgrade, index) => {
      const x = cx - 190 + index * 190;
      const card = this.add
        .rectangle(x, cy + 20, 172, 126, 0x1f2937, 1)
        .setStrokeStyle(2, 0x65a30d, 1)
        .setScrollFactor(0)
        .setDepth(201);
      const label = this.add
        .text(x, cy - 10, upgrade.name, {
          fontFamily: 'Georgia, serif',
          fontSize: '17px',
          color: '#f8fafc',
          align: 'center',
          wordWrap: { width: 150 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(202);
      const description = this.add
        .text(x, cy + 42, upgrade.description, {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: 148 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(202);
      const zone = this.add
        .zone(x, cy + 20, 172, 126)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(203);
      zone.on('pointerover', () => card.setFillStyle(0x365314, 1));
      zone.on('pointerout', () => card.setFillStyle(0x1f2937, 1));
      zone.once('pointerdown', () => this.chooseEndlessUpgrade(upgrade));
      this.endlessUpgradeObjects.push(card, label, description, zone);
    });
  }

  private chooseEndlessUpgrade(upgrade: Upgrade): void {
    upgrade.apply(runState);
    runState.purchases[upgrade.id] = (runState.purchases[upgrade.id] ?? 0) + 1;
    for (const object of this.endlessUpgradeObjects) object.destroy();
    this.endlessUpgradeObjects = [];
    this.endlessUpgradeOpen = false;
    this.physics.resume();
    this.updateHud();
  }

  private checkRoomCleared(): void {
    if (this.roomCleared || this.gameOver) return;
    if (this.enemies.countActive(true) > 0) return;
    this.roomCleared = true;
    this.startClearTransition();
  }

  private startClearTransition(): void {
    this.gameOver = true;
    this.physics.pause();
    this.tweens.add({
      targets: this.player,
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      scaleX: 0.45,
      scaleY: 0.45,
      duration: 360,
      ease: 'Cubic.in',
    });
    this.tweens.add({
      targets: this.cameras.main,
      rotation: 0.28,
      zoom: 1.3,
      duration: 420,
      ease: 'Cubic.in',
    });
    this.cameras.main.fadeOut(360, 8, 8, 14);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('ShopScene'));
  }

  private createMinions(): void {
    for (let i = 0; i < runState.minions; i++) {
      this.minionSprites.push(this.add.image(this.player.x, this.player.y, 'minion').setDepth(18));
    }
  }

  private updateMinions(time: number, delta: number): void {
    for (let i = 0; i < this.minionSprites.length; i++) {
      const minion = this.minionSprites[i];
      const angle = time / 900 + (i * Math.PI * 2) / this.minionSprites.length;
      const orbit = 38 + this.minionSprites.length * 3;
      minion.setPosition(
        this.player.x + Math.cos(angle) * orbit,
        this.player.y + Math.sin(angle) * orbit,
      );
      minion.setRotation(angle + Math.PI / 2);
    }
    if (this.minionSprites.length > 0 && Math.floor(time / 650) !== Math.floor((time - delta) / 650)) {
      this.fireMinionShots();
    }
  }

  private fireMinionShots(): void {
    for (const minion of this.minionSprites) {
      let target: Enemy | undefined;
      let nearest = 260;
      for (const obj of this.enemies.getChildren()) {
        const enemy = obj as Enemy;
        const distance = Phaser.Math.Distance.Between(minion.x, minion.y, enemy.x, enemy.y);
        if (enemy.active && distance < nearest) {
          nearest = distance;
          target = enemy;
        }
      }
      if (!target) continue;
      const shot = this.add.graphics().setDepth(17);
      shot.lineStyle(3, 0x67e8f9, 0.9);
      shot.lineBetween(minion.x, minion.y, target.x, target.y);
      this.tweens.add({ targets: shot, alpha: 0, duration: 100, onComplete: () => shot.destroy() });
      this.showDamageNumber(target.x, target.y - 18, 12);
      if (target.takeDamage(12, minion.x, minion.y, this.time.now)) this.killEnemy(target);
    }
  }

  private updateRadioactiveEssence(delta: number): void {
    if (!this.aura) return;
    this.aura.setPosition(this.player.x, this.player.y);
    this.radioactiveTimer -= delta;
    if (this.radioactiveTimer > 0) return;
    this.radioactiveTimer = 450;
    this.aura.setAlpha(0.2);
    this.tweens.add({ targets: this.aura, alpha: 0.1, duration: 250 });
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= runState.radioactiveRadius) {
        this.showDamageNumber(enemy.x, enemy.y - 18, runState.radioactiveDamage);
        if (enemy.takeDamage(runState.radioactiveDamage, this.player.x, this.player.y, this.time.now)) {
          this.killEnemy(enemy);
        }
      }
    }
  }

  private updateFlamethrower(delta: number): void {
    if (runState.flamethrowerDamage <= 0) return;
    this.flamethrowerTimer -= delta;
    if (this.flamethrowerTimer > 0) return;
    this.flamethrowerTimer = runState.flamethrowerInterval;
    const direction = this.player.facing.clone().normalize();
    const flame = this.add.graphics().setDepth(16);
    flame.fillStyle(0xf97316, 0.32);
    flame.fillTriangle(
      this.player.x + direction.x * 18,
      this.player.y + direction.y * 18,
      this.player.x + direction.x * runState.flamethrowerRange + direction.y * 36,
      this.player.y + direction.y * runState.flamethrowerRange - direction.x * 36,
      this.player.x + direction.x * runState.flamethrowerRange - direction.y * 36,
      this.player.y + direction.y * runState.flamethrowerRange + direction.x * 36,
    );
    this.tweens.add({ targets: flame, alpha: 0, duration: 180, onComplete: () => flame.destroy() });
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      const toEnemy = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y);
      if (toEnemy.length() > runState.flamethrowerRange) continue;
      const angle = Phaser.Math.Angle.Wrap(
        Phaser.Math.Angle.BetweenPoints(Phaser.Math.Vector2.ZERO, toEnemy) - Math.atan2(direction.y, direction.x),
      );
      if (Math.abs(angle) > 0.5) continue;
      this.showDamageNumber(enemy.x, enemy.y - 18, runState.flamethrowerDamage);
      if (enemy.takeDamage(runState.flamethrowerDamage, this.player.x, this.player.y, this.time.now)) {
        this.killEnemy(enemy);
      }
    }
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
    const shieldedAmount = time < this.dashShieldUntil ? amount * 0.7 : amount;
    const died = this.player.hurt(shieldedAmount, time, fromX, fromY);
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
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.coinText = this.add
      .text(GAME_WIDTH - 40, 38, '', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#fbbf24',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.add.image(GAME_WIDTH - 28, 38, 'coin').setScrollFactor(0).setDepth(100).setScale(1.4);
    this.add.image(748, 38, 'arrow').setScrollFactor(0).setDepth(100).setScale(0.8);
    this.arrowText = this.add
      .text(770, 38, '', {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#fef3c7',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.dashText = this.add
      .text(660, 38, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#bfdbfe',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.roundText = this.add
      .text(GAME_WIDTH / 2, 38, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#e2e8f0',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
    const pauseButton = this.add
      .rectangle(850, 38, 64, 30, 0x1f2937, 0.95)
      .setStrokeStyle(2, 0x94a3b8, 0.9)
      .setScrollFactor(0)
      .setDepth(100);
    this.pauseButtonText = this.add
      .text(850, 38, 'Ⅱ', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);
    const pauseZone = this.add
      .zone(850, 38, 64, 30)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.togglePause());
    pauseZone.on('pointerover', () => pauseButton.setFillStyle(0x374151, 1));
    pauseZone.on('pointerout', () => pauseButton.setFillStyle(0x1f2937, 0.95));
    this.updateHud();
  }

  private togglePause(): void {
    if (this.gameOver || this.endlessUpgradeOpen) return;
    this.paused = !this.paused;
    this.pauseButtonText.setText(this.paused ? '▶' : 'Ⅱ');
    if (this.paused) {
      this.physics.pause();
      this.pauseOverlay = this.add
        .container(0, 0)
        .setScrollFactor(0)
        .setDepth(190);
      this.pauseOverlay.add([
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x020617, 0.68),
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 24, 'PAUSED', {
            fontFamily: 'Georgia, serif',
            fontSize: '48px',
            color: '#e2e8f0',
            stroke: '#0f172a',
            strokeThickness: 6,
          })
          .setOrigin(0.5),
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 38, 'Click ▶ to resume', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#94a3b8',
          })
          .setOrigin(0.5),
      ]);
    } else {
      this.pauseOverlay?.destroy(true);
      this.pauseOverlay = undefined;
      this.physics.resume();
    }
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
    this.arrowText.setText(runState.bowOwned ? `${runState.arrows}` : '');
    this.roundText.setText(
      runState.mode === 'endless'
        ? `ENDLESS  ${runState.endlessKills}/${runState.endlessNextUpgrade}`
        : `Round ${runState.round}`,
    );
      this.dashText.setText(this.dashCooldown > 0 ? `DASH ${Math.ceil(this.dashCooldown / 100) / 10}s` : 'DASH READY');
      this.dashText.setColor(this.dashCooldown > 0 ? '#94a3b8' : '#bfdbfe');
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
      .setScrollFactor(0)
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
      .setScrollFactor(0)
      .setDepth(201);
    this.add
      .text(
        cx,
        cy + 6,
        runState.mode === 'endless'
          ? `Reached ${runState.endlessKills} kills  ·  ${runState.coins} coins`
          : `Reached round ${runState.round}  ·  ${runState.coins} coins`,
        {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#e2e8f0',
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(201);
    const back = this.add
      .text(cx, cy + 70, '— Click to return to the menu —', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#94a3b8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
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
