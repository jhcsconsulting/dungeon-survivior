/**
 * End-to-end smoke test: plays through the real game with Puppeteer.
 * Start -> Tutorial -> Classic round 1 (move, slash, dash, shield, clear room)
 * -> Shop (buy, descend) -> Round 2 -> Game over -> Home -> Endless (level up).
 *
 * Run with the dev server up: npm run dev   (then)   npm test
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const GAME_URL = process.env.GAME_URL || 'http://localhost:5173';
const SHOTS = join(dirname(fileURLToPath(import.meta.url)), 'shots') + '/';
mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1280,900'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') pageErrors.push(msg.text());
});

/** Snapshot of the live game state exposed on window.__slime by App.tsx. */
const snap = () =>
  page.evaluate(() => {
    const s = window.__slime.state();
    return {
      phase: window.__slime.phase(),
      px: s.player.x,
      py: s.player.y,
      hp: s.player.hp,
      maxHp: s.player.maxHp,
      enemies: s.enemies.length,
      coins: s.coins,
      round: s.round,
      mode: s.mode,
      level: s.level,
      levels: { ...s.levels },
      anim: s.anim,
      shieldTime: s.player.shieldTime,
      dashCooldown: s.player.dashCooldown,
    };
  });

const clickButton = (text) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((el) => el.textContent.includes(t));
    if (!b) throw new Error(`No button containing "${t}"`);
    b.click();
  }, text);

const waitFor = async (fn, timeoutMs, label) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return true;
    await sleep(200);
  }
  throw new Error(`Timeout waiting for: ${label}`);
};

try {
  // --- Start screen ---
  await page.goto(GAME_URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await waitFor(() => page.evaluate(() => Boolean(window.__slime)), 10000, 'game handle');
  await sleep(800);
  await page.screenshot({ path: `${SHOTS}1-start.png` });
  check('Start screen loads', (await snap()).phase === 'start');

  // --- Tutorial ---
  await clickButton('How to Play');
  await waitFor(async () => (await snap()).phase === 'tutorial', 3000, 'tutorial');
  await waitFor(
    () => page.evaluate(() => document.body.textContent.includes('Welcome, brave slime')),
    5000,
    'tutor greeting',
  );
  await page.screenshot({ path: `${SHOTS}2-tutorial.png` });
  check('Tutorial guide answers', true);
  await clickButton("I'm Ready");
  await waitFor(async () => (await snap()).phase === 'playing', 3000, 'playing');
  await sleep(500);
  let st = await snap();
  check('Round 1 starts with enemies', st.round === 1 && st.enemies >= 4, `enemies=${st.enemies}`);
  await page.screenshot({ path: `${SHOTS}3-round1.png` });

  // --- Movement ---
  const before = { x: st.px, y: st.py };
  await page.keyboard.down('KeyD');
  await sleep(400);
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyW');
  await sleep(250);
  await page.keyboard.up('KeyW');
  st = await snap();
  check(
    'WASD movement works',
    st.px > before.x + 20 && st.py < before.y - 5,
    `(${before.x.toFixed(0)},${before.y.toFixed(0)}) -> (${st.px.toFixed(0)},${st.py.toFixed(0)})`,
  );

  // --- Dash & shield ---
  await page.keyboard.press('Shift');
  await sleep(60);
  st = await snap();
  check('Shift dashes', st.anim === 'dash' && st.dashCooldown > 0, `anim=${st.anim} cd=${st.dashCooldown}`);
  await page.keyboard.press('Digit2');
  await sleep(60);
  st = await snap();
  check('2 raises the shield', st.shieldTime > 0, `shieldTime=${st.shieldTime.toFixed(2)}`);

  // --- Combat: make it deterministic, then clear the room ---
  await page.evaluate(() => {
    const s = window.__slime.state();
    s.player.maxHp = 100000;
    s.player.hp = 100000;
    s.player.damage = 500;
    s.player.attackRange = 400;
    s.coins = 200; // ensure the shop purchase below is affordable
  });
  const enemiesBefore = st.enemies;
  await page.keyboard.down('Space');
  for (let i = 0; i < 60; i++) {
    const key = ['KeyW', 'KeyA', 'KeyS', 'KeyD'][i % 4];
    await page.keyboard.down(key);
    await sleep(250);
    await page.keyboard.up(key);
    st = await snap();
    if (st.enemies === 0) break;
  }
  await page.keyboard.up('Space');
  check('Sword kills enemies', st.enemies < enemiesBefore, `remaining=${st.enemies}`);
  check('Room cleared', st.enemies === 0);
  check('Kills award coins', st.coins > 200, `coins=${st.coins}`);
  await page.screenshot({ path: `${SHOTS}4-cleared.png` });

  // --- Shop ---
  await waitFor(async () => (await snap()).phase === 'market', 8000, 'shop');
  await sleep(400);
  await page.screenshot({ path: `${SHOTS}5-shop.png` });
  const coinsBefore = (await snap()).coins;
  await clickButton('Vitality');
  await sleep(300);
  st = await snap();
  check(
    'Buying an upgrade spends coins and applies it',
    st.coins === coinsBefore - 15 && st.levels.maxHp === 1 && st.maxHp === 100025,
    `coins ${coinsBefore} -> ${st.coins}, levels=${JSON.stringify(st.levels)}`,
  );
  await clickButton('Descend to Round 2');
  await waitFor(async () => (await snap()).phase === 'playing' && (await snap()).round === 2, 5000, 'round 2');
  await sleep(400);
  st = await snap();
  check('Round 2 starts with more enemies', st.enemies >= 6, `enemies=${st.enemies}`);
  await page.screenshot({ path: `${SHOTS}6-round2.png` });

  // --- Game over ---
  await page.evaluate(() => {
    const s = window.__slime.state();
    s.player.maxHp = 100;
    s.player.hp = 1;
    s.player.armor = 0;
  });
  await waitFor(async () => (await snap()).phase === 'dead', 30000, 'game over');
  await sleep(600);
  await page.screenshot({ path: `${SHOTS}7-gameover.png` });
  check('Player death shows Game Over', await page.evaluate(() => document.body.textContent.includes('Game Over')));

  // --- Home -> Endless ---
  await clickButton('Home');
  await waitFor(async () => (await snap()).phase === 'start', 3000, 'home');
  await clickButton('Endless World');
  await clickButton('Enter the Dungeon');
  await waitFor(async () => (await snap()).phase === 'playing' && (await snap()).mode === 'endless', 3000, 'endless');
  await sleep(1500);
  st = await snap();
  check('Endless mode spawns enemies', st.enemies > 0, `enemies=${st.enemies}`);
  await page.screenshot({ path: `${SHOTS}8-endless.png` });
  await page.evaluate(() => {
    const s = window.__slime.state();
    s.player.maxHp = 100000;
    s.player.hp = 100000;
    s.xp = s.xpNeeded;
  });
  await waitFor(async () => (await snap()).phase === 'levelup', 3000, 'level up');
  await sleep(300);
  await page.screenshot({ path: `${SHOTS}9-levelup.png` });
  st = await snap();
  check('Endless level up offers upgrades', st.level === 2);
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('button')].filter((b) => b.closest('.grid'));
    cards[0].click();
  });
  await waitFor(async () => (await snap()).phase === 'playing', 3000, 'resume after level up');
  check('Picking an upgrade resumes play', true);
} catch (err) {
  check('Script completed', false, err.message);
  await page.screenshot({ path: `${SHOTS}error.png` }).catch(() => {});
}

check('No page errors', pageErrors.length === 0, pageErrors.join(' | '));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
