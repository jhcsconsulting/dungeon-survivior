import Phaser from 'phaser';
import { runState } from '../state/RunState';

export class Player extends Phaser.Physics.Arcade.Image {
  /** Last non-zero aim direction; used for keyboard attacks. */
  readonly facing = new Phaser.Math.Vector2(1, 0);
  private attackCooldown = 0;
  private invulnUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'slime');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(16, 8, 8);
    body.setCollideWorldBounds(true);
    body.setDrag(1400, 1400);
    body.setMaxVelocity(runState.moveSpeed, runState.moveSpeed);

    // Idle jiggle so the blob feels alive.
    scene.tweens.add({
      targets: this,
      scaleX: { from: 1, to: 1.07 },
      scaleY: { from: 1, to: 0.93 },
      duration: 430,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  move(dirX: number, dirY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(runState.moveSpeed, runState.moveSpeed);
    const accel = runState.moveSpeed * 8;
    body.setAcceleration(dirX * accel, dirY * accel);
    if (dirX !== 0 || dirY !== 0) {
      this.facing.set(dirX, dirY).normalize();
    }
  }

  tickCooldown(delta: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
  }

  canAttack(): boolean {
    return this.attackCooldown <= 0;
  }

  startAttackCooldown(): void {
    this.attackCooldown = 1000 / runState.attackSpeed;
  }

  isInvulnerable(time: number): boolean {
    return time < this.invulnUntil;
  }

  /** Applies damage; returns true if the player died. */
  hurt(amount: number, time: number, fromX: number, fromY: number): boolean {
    if (this.isInvulnerable(time)) return false;
    const dealt = Math.max(1, Math.round(amount * runState.damageTakenMult));
    runState.hp -= dealt;
    this.invulnUntil = time + runState.iframesMs;

    // Knockback away from the hit source.
    const away = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(260);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(away.x, away.y);

    this.setTintFill(0xffffff);
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.25, to: 1 },
      duration: 110,
      repeat: Math.floor(runState.iframesMs / 220),
      yoyo: true,
      onStart: () => this.scene.time.delayedCall(90, () => this.clearTint()),
      onComplete: () => this.setAlpha(1),
    });

    return runState.hp <= 0;
  }
}
