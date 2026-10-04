/** Logical canvas size. The canvas is scaled with CSS but all game math uses these units. */
export const WIDTH = 800;
export const HEIGHT = 600;

export const PLAYER_SIZE = 28;
export const ENEMY_SIZE = 26;
export const TANK_SIZE = 40;

/** Endless mode: the world is tiled into square chunks that deterministically generate obstacles. */
export const CHUNK_SIZE = 320;

/** The slime body is roughly this many pixels wide inside a 128px sprite frame. */
export const SPRITE_FRAME_SIZE = 128;
export const SPRITE_BODY_PX = 64;
