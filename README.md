# Slime Dungeon

A 2D browser roguelite, ported from the Base44-hosted
[Slime Dungeon](https://neon-slime-dungeon-dash.base44.app/) into a self-contained
Vite + React + TypeScript project. You are a slime with a sword fighting through escalating
dungeon rounds; enemies drop coins you spend on upgrades in the shop between rounds.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle in dist/
npm test           # Puppeteer smoke test (needs the dev server running)
```

## Controls

| Key              | Action                                           |
| ---------------- | ------------------------------------------------ |
| WASD / Arrows    | Move                                             |
| Space            | Sword swing                                      |
| F                | Fire bow toward the mouse (once you own a bow)   |
| G                | Flamethrower toward the mouse (once you own one) |
| Shift            | Dash — damages, knocks back, halves damage taken |
| 2                | Directional shield (3 s) that blocks projectiles |

Pause and mute buttons live in the HUD above the canvas.

## Modes

- **Classic** — clear each room to open the shop, then descend. Enemy count and strength scale
  with the round; a boss guards every 5th round. The biome (Stone Dungeon, Mossy Cave, Lava
  Cavern, Ice Crypt, Arcane Ruins) rotates every 3 rounds.
- **Endless World** — an infinite, chunk-generated dungeon that scrolls with you. Kills grant
  XP; on level-up pick one of three upgrades.

Gold and kills from every run feed a persistent **prestige** shop on the start screen
(permanent starting HP / damage / speed / armor / regen, and starting weapons). Progress is
saved in `localStorage`.

## Project layout

```
src/
  App.tsx              game loop, input, phase/HUD state, screen routing
  components/          StartScreen, Shop, GameOver, LevelUp, TutorialScreen, AgentPanels
  game/
    constants.ts       canvas + entity sizes
    types.ts           Player / Enemy / GameState / Hud ...
    state.ts           createGameState, setupRound, endless spawning, HUD snapshot
    entities.ts        player + enemy + minion factories
    update.ts          the per-frame simulation (movement, combat, AI, drops, level-ups)
    render.ts          canvas renderer (sprites, enemies, effects, HUD overlays)
    purchases.ts       shop purchase effects
    shop.ts / prestige.ts / levelUp.ts   item tables
    biomes.ts / world.ts                 backgrounds and endless-world obstacles
    sprites.ts         sprite-sheet frame loader + animation timings
    agents.ts          local scripted narrator / companion / tutor
    music.ts           procedural Web Audio chiptune
    storage.ts         localStorage persistence
public/sprites/<anim>/ slime hero frames (idle, walk, dash, attack, hurt, death)
test/verify.mjs        end-to-end Puppeteer smoke test
```

## Differences from the Base44 original

- The original's narrator, companion and tutorial guide were Base44 server-side AI agents.
  They are replaced by local scripted responses in `src/game/agents.ts` with the same UI, so
  the game runs fully offline with no backend.
- Base44 auth, routing and analytics were dropped; `react-markdown` is replaced by a tiny
  built-in `Markdown` component.
- The hero is drawn from the sliced sprite sheet with proper animation states (the hosted
  build fell back to a procedural slime because its sprite archive was malformed).
