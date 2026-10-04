import { useState } from 'react';
import type { GameMode } from '../game/types';

const FLOOR_TILE =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='90'><rect width='140' height='90' fill='%23262320'/><rect x='0' y='0' width='70' height='45' fill='%232b2724'/><rect x='70' y='0' width='70' height='45' fill='%23221f1c'/><rect x='-35' y='45' width='70' height='45' fill='%23222020'/><rect x='35' y='45' width='70' height='45' fill='%23252220'/><rect x='105' y='45' width='70' height='45' fill='%23221f1c'/><g stroke='%23000' stroke-opacity='0.5' stroke-width='1.5'><line x1='0' y1='45' x2='140' y2='45'/><line x1='0' y1='0' x2='0' y2='45'/><line x1='70' y1='0' x2='70' y2='45'/><line x1='35' y1='45' x2='35' y2='90'/><line x1='105' y1='45' x2='105' y2='90'/></g></svg>";

function Torch({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 flex flex-col items-center ${side === 'left' ? 'left-4 sm:left-16' : 'right-4 sm:right-16'}`}
    >
      <div className="absolute -top-8 w-44 h-44 rounded-full bg-amber-500/25 blur-2xl animate-[torch-glow_2.4s_ease-in-out_infinite]" />
      <div className="w-2.5 h-10 bg-gradient-to-b from-stone-600 to-stone-800 rounded-sm shadow-inner" />
      <div className="relative -mt-1">
        <div className="w-7 h-11 rounded-full bg-gradient-to-t from-orange-700 via-amber-400 to-yellow-100 animate-[torch-flicker_0.55s_ease-in-out_infinite] shadow-[0_0_24px_8px_rgba(251,146,60,0.55)]" />
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-6 rounded-full bg-yellow-100/90 animate-[torch-flicker_0.45s_ease-in-out_infinite_reverse]" />
      </div>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute bottom-2 w-1 h-1 rounded-full bg-amber-300/80 animate-[ember-rise_2.2s_ease-in_infinite]"
          style={{ left: `${4 + i * 6}px`, animationDelay: `${i * 0.7}s` }}
        />
      ))}
    </div>
  );
}

const MODES: { key: GameMode; label: string; desc: string }[] = [
  { key: 'classic', label: '🏰 Classic', desc: 'Waves & shop' },
  { key: 'endless', label: '♾️ Endless World', desc: 'Survive the horde' },
];

interface Props {
  onStart: (mode: GameMode) => void;
  onTutorial: () => void;
}

export function StartScreen({ onStart, onTutorial }: Props) {
  const [mode, setMode] = useState<GameMode>('classic');
  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center text-center px-6">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: '#1c1917', backgroundImage: `url("${FLOOR_TILE}")`, backgroundSize: '140px 90px' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.92) 100%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3"
        style={{ background: 'linear-gradient(to top, #0c0a09, rgba(12,10,9,0))' }}
      />
      <Torch side="left" />
      <Torch side="right" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative px-10 py-7 rounded-2xl bg-gradient-to-b from-stone-700/85 to-stone-900/90 ring-2 ring-stone-950/80 shadow-[0_12px_44px_rgba(0,0,0,0.65),inset_0_2px_6px_rgba(255,255,255,0.08)]">
          <div className="absolute inset-0 rounded-2xl ring-1 ring-amber-900/30" />
          <div className="text-5xl mb-1">🟢</div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-lime-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(74,222,128,0.4)]">
            SLIME DUNGEON
          </h1>
        </div>
        <p className="mt-5 text-slate-300 max-w-md">
          Crawl ever deeper. Slay monsters, grab coins, upgrade in the shop, and survive the boss every 5 rounds.
        </p>
        <div className="mt-6 flex items-center gap-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold ring-1 transition ${
                mode === m.key
                  ? 'bg-violet-600 text-white ring-violet-400'
                  : 'bg-stone-800/80 text-slate-300 ring-stone-700 hover:bg-stone-700'
              }`}
            >
              {m.label} <span className="opacity-70 text-[10px]">· {m.desc}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onStart(mode)}
          className="mt-5 px-8 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-lg font-bold shadow-lg shadow-violet-900/50 transition [font-family:'Minion_Pro',sans-serif]"
        >
          ⚔️ Enter the Dungeon
        </button>
        <button
          onClick={onTutorial}
          className="mt-3 px-6 py-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-amber-200 text-sm font-semibold ring-1 ring-amber-800/50 transition"
        >
          🧙 How to Play (Tutorial)
        </button>
        <p className="mt-4 text-[11px] text-stone-500">Tip: buy the bow early and stock up on arrows.</p>
      </div>
    </div>
  );
}
