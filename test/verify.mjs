/**
 * End-to-end smoke test: plays through the real game loop with Puppeteer.
 * Menu -> Dungeon (move, slash, clear room) -> Door -> Shop (buy, continue)
 * -> Round 2 -> Game over -> Menu.
 *
 * Run with the dev server up: node test/verify.mjs
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const GAME_URL = 'http://localhost:5173';
const SHOTS = join(dirname(fileURLToPath(import.meta.url)), 'shots') + '/';
mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--window-size=980,560'],
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });

page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
});

const activeScenes = () =>
  page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));

const dungeonState = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScene('DungeonScene');
    return {
      px: s.player.x,
      py: s.player.y,
      enemies: s.enemies.countActive(true),
      coins: s.coins.countActive(true),
      hasDoor: Boolean(s.door),
      gameOver: s.gameOver,
      run: JSON.parse(JSON.stringify(window.__runState)),
    };
  });

const waitFor = async (fn, timeoutMs, label) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timeout waiting for: ${label}`);
};

try {
  // --- Menu ---
  await page.goto(GAME_URL, { waitUntil: 'networkidle2' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await waitFor(async () => (await activeScenes()).includes('MenuScene'), 10000, 'MenuScene');
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: `${SHOTS}1-menu.png` });
  check('Menu scene loads', true);

  // --- Start game ---
  await page.mouse.click(480, 270);
  await waitFor(async () => (await activeScenes()).includes('DungeonScene'), 8000, 'DungeonScene');
  await new Promise((r) => setTimeout(r, 600));
  let st = await dungeonState();
  check('Round 1 starts with enemies', st.enemies === 6, `enemies=${st.enemies} (expect 6)`);
  check('Round is 1', st.run.round === 1, `round=${st.run.round}`);
  await page.screenshot({ path: `${SHOTS}2-dungeon-round1.png` });

  // --- Movement ---
  const before = { x: st.px, y: st.py };
  await page.keyboard.down('KeyD');
  await new Promise((r) => setTimeout(r, 450));
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyW');
  await new Promise((r) => setTimeout(r, 300));
  await page.keyboard.up('KeyW');
  st = await dungeonState();
  check(
    'WASD movement works',
    st.px > before.x + 20 && st.py < before.y - 5,
    `moved (${before.x.toFixed(0)},${before.y.toFixed(0)}) -> (${st.px.toFixed(0)},${st.py.toFixed(0)})`,
  );

  // --- Combat: clear the room (survivability boost so the test is deterministic) ---
  await page.evaluate(() => {
    window.__runState.maxHp = 100000;
    window.__runState.hp = 100000;
  });
  const enemiesBefore = st.enemies;
  await page.keyboard.down('Space');
  // Wander a little so we meet enemies and hoover up coins.
  const wander = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  for (let i = 0; i < 60; i++) {
    const key = wander[i % 4];
    await page.keyboard.down(key);
    await new Promise((r) => setTimeout(r, 400));
    await page.keyboard.up(key);
    st = await dungeonState();
    if (st.enemies === 0) break;
  }
  await page.keyboard.up('Space');
  check('Sword kills enemies', st.enemies < enemiesBefore, `remaining=${st.enemies}`);
  check('Room cleared', st.enemies === 0, `remaining=${st.enemies}`);
  check('Enemies dropped coins', st.run.coins > 0 || st.coins > 0, `collected=${st.run.coins}, onFloor=${st.coins}`);

  // --- Door appears; walk in ---
  await waitFor(async () => (await dungeonState()).hasDoor, 5000, 'door spawn');
  check('Door appears when room is clear', true);
  await page.screenshot({ path: `${SHOTS}3-door.png` });
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('DungeonScene');
    s.player.setPosition(480, 60); // walk-up shortcut: place player at the door
  });
  await waitFor(async () => (await activeScenes()).includes('ShopScene'), 8000, 'ShopScene');
  check('Door leads to marketplace', true);
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${SHOTS}4-shop.png` });

  // --- Shop: buy an upgrade ---
  const coinsBefore = await page.evaluate(() => {
    window.__runState.coins = 100; // ensure affordable for the purchase test
    return window.__runState.coins;
  });
  await page.mouse.click(198, 228); // first card: Heart Gel
  await new Promise((r) => setTimeout(r, 300));
  const afterBuy = await page.evaluate(() => JSON.parse(JSON.stringify(window.__runState)));
  check(
    'Buying an upgrade spends coins and applies it',
    afterBuy.coins < coinsBefore && (afterBuy.purchases['heart-gel'] ?? 0) === 1,
    `coins ${coinsBefore} -> ${afterBuy.coins}, purchases=${JSON.stringify(afterBuy.purchases)}`,
  );
  await page.screenshot({ path: `${SHOTS}5-shop-bought.png` });

  // --- Continue to round 2 ---
  await page.mouse.click(480, 491);
  await waitFor(
    async () =>
      (await activeScenes()).includes('DungeonScene') &&
      (await dungeonState()).run.round === 2,
    8000,
    'round 2',
  );
  await new Promise((r) => setTimeout(r, 600));
  st = await dungeonState();
  check('Round 2 starts with more enemies', st.enemies === 8, `enemies=${st.enemies} (expect 8)`);
  await page.screenshot({ path: `${SHOTS}6-dungeon-round2.png` });

  // --- Game over ---
  await page.evaluate(() => {
    window.__runState.hp = 1;
    window.__runState.maxHp = 100;
  });
  await waitFor(async () => (await dungeonState()).gameOver, 30000, 'game over');
  check('Player death triggers game over', true);
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: `${SHOTS}7-gameover.png` });
  await page.mouse.click(480, 270);
  await waitFor(async () => (await activeScenes()).includes('MenuScene'), 8000, 'back to menu');
  const resetState = await page.evaluate(() => JSON.parse(JSON.stringify(window.__runState)));
  check(
    'Game over returns to menu and resets the run',
    resetState.round === 1 && resetState.coins === 0 && resetState.hp === 100,
    `round=${resetState.round}, coins=${resetState.coins}, hp=${resetState.hp}`,
  );
} catch (err) {
  check('Script completed', false, err.message);
  await page.screenshot({ path: `${SHOTS}error.png` }).catch(() => {});
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
