import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { DungeonScene } from './scenes/DungeonScene';
import { ShopScene } from './scenes/ShopScene';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0b12',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MenuScene, DungeonScene, ShopScene],
};
