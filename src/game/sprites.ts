import type { AnimName } from './types';

export type SpriteFrames = Record<AnimName, HTMLImageElement[]>;

/** Frame counts per animation under /public/sprites/<anim>/<anim>_NN.png */
const FRAME_COUNTS: Record<AnimName, number> = {
  idle: 5,
  walk: 8,
  dash: 5,
  attack: 6,
  hurt: 5,
  death: 6,
};

/** Playback speed (frames per second) for each animation. */
export const ANIM_FPS: Record<AnimName, number> = {
  idle: 6,
  walk: 12,
  dash: 16,
  attack: 30,
  hurt: 10,
  death: 8,
};

/** Animations that stop on their last frame instead of looping. */
export const ANIM_HOLD_LAST: Partial<Record<AnimName, boolean>> = { death: true };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/** Loads every animation; an animation that fails to load resolves to an empty array so the game can fall back. */
export async function loadSpriteFrames(baseUrl = import.meta.env.BASE_URL): Promise<SpriteFrames> {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const out = {} as SpriteFrames;
  await Promise.all(
    (Object.keys(FRAME_COUNTS) as AnimName[]).map(async (anim) => {
      const urls = Array.from(
        { length: FRAME_COUNTS[anim] },
        (_, i) => `${base}sprites/${anim}/${anim}_${String(i + 1).padStart(2, '0')}.png`,
      );
      try {
        out[anim] = await Promise.all(urls.map(loadImage));
      } catch (err) {
        console.warn(`Sprite animation "${anim}" failed to load`, err);
        out[anim] = [];
      }
    }),
  );
  return out;
}
