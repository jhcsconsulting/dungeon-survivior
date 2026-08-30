import Phaser from 'phaser';
import { gameConfig } from './game/config';
import { runState } from './game/state/RunState';

const game = new Phaser.Game(gameConfig);

// Debug hook for automated testing.
(window as unknown as Record<string, unknown>).__game = game;
(window as unknown as Record<string, unknown>).__runState = runState;
