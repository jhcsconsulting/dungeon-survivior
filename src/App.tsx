import { useCallback, useEffect, useRef, useState } from 'react';
import { CompanionPanel, NarratorPanel } from './components/AgentPanels';
import { GameOver } from './components/GameOver';
import { LevelUp } from './components/LevelUp';
import { Shop } from './components/Shop';
import { StartScreen } from './components/StartScreen';
import { TutorialScreen } from './components/TutorialScreen';
import { useAgentConversation } from './game/agents';
import { biomeNameForRound } from './game/biomes';
import { HEIGHT, WIDTH } from './game/constants';
import { startMusic, toggleMute } from './game/music';
import { prestigeCost } from './game/prestige';
import { applyPurchase, type Purchase } from './game/purchases';
import { drawGame } from './game/render';
import { loadSpriteFrames, type SpriteFrames } from './game/sprites';
import { createGameState, hudFromState, INITIAL_HUD, setupRound } from './game/state';
import { loadPrestige, loadTotalGold, loadTotalKills, loadUnlocks, savePrestige, saveUnlocks } from './game/storage';
import type { GameMode, GameState, Hud, Input, LevelUpgrade, Phase, PrestigeItem, Unlocks } from './game/types';
import { updateAnimation, updateGame } from './game/update';

declare global {
  interface Window {
    /** Debug handle used by the smoke test. */
    __slime?: { state: () => GameState | null; phase: () => Phase };
  }
}

interface LevelUpInfo {
  level: number;
  choices: LevelUpgrade[];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef<Input>({ keys: {}, mouse: { x: WIDTH / 2, y: HEIGHT / 2 } });
  const spritesRef = useRef<SpriteFrames | null>(null);
  const rafRef = useRef(0);

  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [phase, setPhaseState] = useState<Phase>('start');
  const phaseRef = useRef<Phase>('start');
  const [paused, setPausedState] = useState(false);
  const pausedRef = useRef(false);
  const [mode, setMode] = useState<GameMode>('classic');
  const [muted, setMuted] = useState(false);
  const [levelUp, setLevelUp] = useState<LevelUpInfo | null>(null);

  const [prestige, setPrestige] = useState(() => loadPrestige());
  const [unlocks, setUnlocks] = useState<Unlocks>(() => loadUnlocks());
  const [earnedPrestige, setEarnedPrestige] = useState(0);
  const [totalGold, setTotalGold] = useState(() => loadTotalGold());
  const [totalKills, setTotalKills] = useState(() => loadTotalKills());

  const narrator = useAgentConversation('dungeon_narrator');
  const [narratorOpen, setNarratorOpen] = useState(true);
  const narratedRound = useRef<number | null>(null);
  const companion = useAgentConversation('dungeon_companion');
  const [companionOpen, setCompanionOpen] = useState(true);
  const cheeredRound = useRef<number | null>(null);
  const cheeredClear = useRef(false);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);
  const setPaused = useCallback((p: boolean) => {
    pausedRef.current = p;
    setPausedState(p);
  }, []);

  // ----- Narrator & companion commentary -----
  useEffect(() => {
    if (phase !== 'playing' || narratedRound.current === hud.round) return;
    narratedRound.current = hud.round;
    const boss = hud.round % 5 === 0;
    narrator.send(
      `The player just entered a new dungeon level: Round ${hud.round}, biome "${biomeNameForRound(hud.round)}"${boss ? ', and a BOSS lurks here' : ''}. Give a 2-3 sentence narration plus one helpful tip.`,
    );
    setNarratorOpen(true);
  }, [phase, hud.round, narrator.send]);

  useEffect(() => {
    if (phase !== 'playing' || cheeredRound.current === hud.round) return;
    cheeredRound.current = hud.round;
    cheeredClear.current = false;
    const boss = hud.round % 5 === 0;
    companion.send(
      `Round ${hud.round} just started${boss ? ' and a BOSS guards this floor' : ''}. Give a quick cheer and remind the player to clear all enemies to descend to the shop.`,
    );
    setCompanionOpen(true);
  }, [phase, hud.round, companion.send]);

  useEffect(() => {
    if (phase !== 'playing' || hud.enemiesLeft !== 0 || cheeredClear.current) return;
    cheeredClear.current = true;
    companion.send(
      "The player just cleared the room! Cheer them on and remind them the shop is next, then they'll descend deeper.",
    );
    setCompanionOpen(true);
  }, [phase, hud.enemiesLeft, companion.send]);

  // ----- Run setup -----
  const initGame = useCallback((gameMode: GameMode) => {
    const state = createGameState(gameMode, loadUnlocks());
    stateRef.current = state;
    setHud(hudFromState(state));
  }, []);

  // ----- Keyboard -----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      inputRef.current.keys[key] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
      if (e.repeat) return;
      const state = stateRef.current;
      if (!state || phaseRef.current !== 'playing' || pausedRef.current) return;
      const p = state.player;
      const keys = inputRef.current.keys;

      if (key === 'shift' && p.dashCooldown <= 0 && p.dashTime <= 0) {
        let dx = 0;
        let dy = 0;
        if (keys.w || keys.arrowup) dy -= 1;
        if (keys.s || keys.arrowdown) dy += 1;
        if (keys.a || keys.arrowleft) dx -= 1;
        if (keys.d || keys.arrowright) dx += 1;
        if (!dx && !dy) {
          dx = p.facing.x;
          dy = p.facing.y;
        }
        const len = Math.hypot(dx, dy) || 1;
        p.dashDir = { x: dx / len, y: dy / len };
        p.dashTime = 0.28;
        p.dashCooldown = p.dashCdMax;
        state.dashId = (state.dashId || 0) + 1;
      }
      if (key === '2' && p.shieldCooldown <= 0 && p.shieldTime <= 0) {
        const len = Math.hypot(p.facing.x, p.facing.y) || 1;
        p.shieldDir = { x: p.facing.x / len, y: p.facing.y / len };
        p.shieldTime = 3;
        p.shieldCooldown = p.shieldCdMax;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ----- Mouse (canvas-relative, in logical units) -----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      inputRef.current.mouse = {
        x: ((e.clientX - r.left) / r.width) * WIDTH,
        y: ((e.clientY - r.top) / r.height) * HEIGHT,
      };
    };
    canvas.addEventListener('mousemove', onMove);
    return () => canvas.removeEventListener('mousemove', onMove);
  }, []);

  // ----- Sprites -----
  useEffect(() => {
    let cancelled = false;
    loadSpriteFrames()
      .then((frames) => {
        if (!cancelled) spritesRef.current = frames;
      })
      .catch((err) => console.warn('Sprite load failed', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // ----- Main loop -----
  useEffect(() => {
    initGame('classic');
    let last = performance.now();
    const hooks = {
      onLevelUp: (level: number, choices: LevelUpgrade[]) => {
        setLevelUp({ level, choices });
        setPhase('levelup');
      },
      onRoomCleared: () => setPhase('market'),
      onDeath: (r: { earnedPrestige: number; totalPrestige: number; totalGold: number; totalKills: number }) => {
        setPrestige(r.totalPrestige);
        setEarnedPrestige(r.earnedPrestige);
        setTotalGold(r.totalGold);
        setTotalKills(r.totalKills);
        setPhase('dead');
      },
    };
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (state && canvas) {
        const ph = phaseRef.current;
        if ((ph === 'playing' || ph === 'market') && !pausedRef.current) {
          updateGame(state, inputRef.current, dt, ph === 'market', hooks);
          if (ph === 'playing') setHud(hudFromState(state));
        } else if (ph === 'dead') {
          updateAnimation(state, false, dt);
        }
        const ctx = canvas.getContext('2d');
        if (ctx) drawGame(ctx, state, inputRef.current, spritesRef.current);
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [initGame, setPhase]);

  // Debug handle for automated tests.
  useEffect(() => {
    window.__slime = { state: () => stateRef.current, phase: () => phaseRef.current };
    return () => {
      delete window.__slime;
    };
  }, []);

  // ----- Actions -----
  const startGame = (gameMode: GameMode = 'classic') => {
    setMode(gameMode);
    initGame(gameMode);
    setEarnedPrestige(0);
    startMusic();
    setPhase('playing');
  };

  const restart = () => {
    initGame(mode);
    setPaused(false);
    setLevelUp(null);
    narratedRound.current = null;
    cheeredRound.current = null;
    cheeredClear.current = false;
    setEarnedPrestige(0);
    setPhase('playing');
  };

  const goHome = () => {
    setPaused(false);
    setLevelUp(null);
    setPhase('start');
  };

  const buy = (purchase: Purchase) => {
    const state = stateRef.current;
    if (!state) return;
    if (applyPurchase(state, purchase)) setHud(hudFromState(state));
  };

  const nextRound = () => {
    const state = stateRef.current;
    if (!state) return;
    setupRound(state, state.round + 1);
    setHud(hudFromState(state));
    setPhase('playing');
  };

  const buyPrestige = (item: PrestigeItem) => {
    const level = (unlocks && +unlocks[item.key]) || 0;
    if (level >= item.max) return;
    const cost = prestigeCost(item, level);
    if (prestige < cost) return;
    const remaining = prestige - cost;
    const next = { ...unlocks, [item.key]: level + 1 };
    savePrestige(remaining);
    saveUnlocks(next);
    setPrestige(remaining);
    setUnlocks(next);
  };

  const pickUpgrade = (choice: LevelUpgrade) => {
    const state = stateRef.current;
    if (!state || !state.pendingUpgrades) return;
    choice.apply(state.player);
    state.pendingUpgrades = null;
    setLevelUp(null);
    setPhase('playing');
  };

  const togglePause = () => setPaused(!pausedRef.current);
  const onToggleMute = () => setMuted(toggleMute());

  const endless = mode === 'endless';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
      {phase === 'start' && <StartScreen onStart={startGame} onTutorial={() => setPhase('tutorial')} />}

      {/* HUD */}
      <div className="mb-3 w-full max-w-[800px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-200">
          {endless ? (
            <span className="px-3 py-1 rounded-full bg-cyan-900/60 text-cyan-200">⏱ {hud.time}s</span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-violet-900/60 text-violet-200">Round {hud.round}</span>
          )}
          {endless && (
            <span className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full bg-amber-900/60 text-amber-200 text-xs font-semibold">
                Lv {hud.level}
              </span>
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
                  style={{ width: `${Math.min(100, (hud.xp / hud.xpNeeded) * 100)}%` }}
                />
              </div>
            </span>
          )}
          {!endless && (
            <span className="flex items-center gap-1 text-amber-300">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-400" /> {hud.coins} coins
            </span>
          )}
          <span className="text-rose-300">Enemies: {hud.enemiesLeft}</span>
          {hud.hasBow && <span className="text-sky-300 flex items-center gap-1">🏹 {hud.arrows}</span>}
          {hud.aura > 0 && <span className="text-lime-300 flex items-center gap-1">☢️ {hud.aura}</span>}
          {hud.minions > 0 && <span className="text-emerald-300 flex items-center gap-1">🤖 {hud.minions}</span>}
          {hud.hasFlame && <span className="text-orange-300 flex items-center gap-1">🔥 {hud.fuel}</span>}
          {hud.armor > 0 && <span className="text-emerald-300 flex items-center gap-1">🛡️ {hud.armor}</span>}
          {hud.speedBoost > 0 && <span className="text-cyan-300 flex items-center gap-1">✦ {hud.speedBoost}s</span>}
          {hud.damageBoost > 0 && (
            <span className="text-orange-300 flex items-center gap-1">⚔ {hud.damageBoost}s</span>
          )}
          <span className={`flex items-center gap-1 ${hud.dashCd > 0 ? 'text-slate-500' : 'text-cyan-300'}`}>
            💨 {hud.dashCd > 0 ? `${hud.dashCd}s` : 'Ready'}
          </span>
          <span className={`flex items-center gap-1 ${hud.shieldCd > 0 ? 'text-slate-500' : 'text-sky-300'}`}>
            🔮 {hud.shieldCd > 0 ? `${hud.shieldCd}s` : 'Ready'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            title="Toggle music"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {phase === 'playing' && (
            <button
              onClick={togglePause}
              className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          <div className="w-40 h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-emerald-500 transition-all"
              style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-300 w-16">
            {hud.hp}/{hud.maxHp} HP
          </span>
        </div>
      </div>

      {hud.bossActive && (
        <div className="mb-2 w-full max-w-[800px]">
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-rose-300 tracking-wide">👹 DUNGEON BOSS</span>
            <span className="text-rose-200">
              {hud.bossHp} / {hud.bossMaxHp} HP
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-800 overflow-hidden ring-1 ring-rose-900/60">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 transition-all duration-150"
              style={{ width: `${(hud.bossHp / hud.bossMaxHp) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Canvas + overlays */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="rounded-xl shadow-2xl ring-2 ring-violet-900/50 max-w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        {phase === 'playing' && paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-xl gap-3">
            <h2 className="text-3xl font-bold text-violet-200">Paused</h2>
            <button
              onClick={togglePause}
              className="px-6 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
            >
              Resume
            </button>
          </div>
        )}
        {phase === 'market' && (
          <div className="absolute left-0 right-0 top-0 bottom-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-t-xl px-2">
            <Shop
              coins={hud.coins}
              hasBow={hud.hasBow}
              arrows={hud.arrows}
              hasFlame={hud.hasFlame}
              hasElectric={hud.hasElectric}
              fuel={hud.fuel}
              levels={hud.levels}
              onBuy={buy}
              onNext={nextRound}
              round={hud.round}
            />
          </div>
        )}
        {phase === 'dead' && (
          <GameOver
            score={hud.score}
            round={hud.round}
            coins={hud.coins}
            prestige={prestige}
            earnedPrestige={earnedPrestige}
            unlocks={unlocks}
            onBuyPrestige={buyPrestige}
            onRestart={restart}
            onHome={goHome}
            totalGold={totalGold}
            totalKills={totalKills}
            mode={mode}
            time={hud.time}
          />
        )}
        {phase === 'levelup' && levelUp && <LevelUp level={levelUp.level} choices={levelUp.choices} onPick={pickUpgrade} />}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Move: <span className="text-slate-200 font-semibold">WASD / Arrows</span>
        {'  ·  '}Sword: <span className="text-slate-200 font-semibold">Space</span>
        {'  ·  '}Bow: <span className="text-slate-200 font-semibold">F</span>
        {'  ·  '}Flame: <span className="text-slate-200 font-semibold">G</span>
        {'  ·  '}Dash: <span className="text-slate-200 font-semibold">Shift</span>
        {'  ·  '}Shield: <span className="text-slate-200 font-semibold">2</span>
        {'  ·  '}
        {endless ? 'Survive as long as you can — the world is endless.' : 'Clear all enemies to descend to the shop.'}
      </p>

      {phase === 'playing' && (
        <NarratorPanel
          messages={narrator.messages}
          loading={narrator.loading}
          open={narratorOpen}
          onToggle={() => setNarratorOpen((o) => !o)}
        />
      )}
      {phase === 'playing' && (
        <CompanionPanel
          messages={companion.messages}
          loading={companion.loading}
          open={companionOpen}
          onToggle={() => setCompanionOpen((o) => !o)}
        />
      )}
      {phase === 'tutorial' && <TutorialScreen onReady={() => startGame('classic')} />}
    </div>
  );
}
