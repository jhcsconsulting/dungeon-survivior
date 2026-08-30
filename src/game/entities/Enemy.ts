import Phaser from 'phaser';
import { EnemyKind, EnemyStats, statsFor } from '../data/waves';

const SHOOTER_RANGE = 230;
const SHOOTER_FIRE_INTERVAL = 1900;

export class Enemy extends Phaser.Physics.Arcade.Image {
  readonly kind: EnemyKind;
  readonly stats: EnemyStats;
  hp: number;
  private fireTimer: number;
  private knockbackUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind, round: number) {
    super(scene, x, y, kind);
    this.kind = kind;
    this.stats = statsFor(kind, round);
    this.hp = this.stats.hp;
    this.fireTimer = SHOOTER_FIRE_INTERVAL * (0.5 + Math.random() * 0.5);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const r = this.stats.radius;
    body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    body.setCollideWorldBounds(true);

    // Spawn pop-in.
    this.setScale(0);
    scene.tweens.add({ targets: this, scale: 1, duration: 250, ease: 'Back.out' });
  }

  /** Returns true when this enemy wants to fire a projectile this frame. */
  updateAI(player: Phaser.GameObjects.Components.Transform, time: number, delta: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (time < this.knockbackUntil) return false;

    const toPlayer = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    const dist = toPlayer.length();
    toPlayer.normalize();

    if (this.kind === 'shooter') {
      // Kite: keep mid-range, strafe slightly.
      if (dist > SHOOTER_RANGE + 50) {
        body.setVelocity(toPlayer.x * this.stats.speed, toPlayer.y * this.stats.speed);
      } else if (dist < SHOOTER_RANGE - 60) {
        body.setVelocity(-toPlayer.x * this.stats.speed, -toPlayer.y * this.stats.speed);
      } else {
        body.setVelocity(-toPlayer.y * this.stats.speed * 0.4, toPlayer.x * this.stats.speed * 0.4);
      }
      this.fireTimer -= delta;
      if (this.fireTimer <= 0 && dist < SHOOTER_RANGE + 120) {
        this.fireTimer = SHOOTER_FIRE_INTERVAL;
        return true;
      }
      return false;
    }

    // Chaser and tank both walk straight at the player.
    body.setVelocity(toPlayer.x * this.stats.speed, toPlayer.y * this.stats.speed);
    return false;
  }

  /** Applies damage and knockback; returns true if the enemy died. */
  takeDamage(amount: number, fromX: number, fromY: number, time: number): boolean {
    this.hp -= amount;

    const kb = this.kind === 'tank' ? 90 : 220;
    const away = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(kb);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(away.x, away.y);
    this.knockbackUntil = time + 140;

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });

    return this.hp <= 0;
  }
}
