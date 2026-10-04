import { PRESTIGE_ITEMS, prestigeCost } from '../game/prestige';
import type { GameMode, PrestigeItem, Unlocks } from '../game/types';

interface Props {
  score: number;
  round: number;
  coins: number;
  prestige: number;
  earnedPrestige: number;
  unlocks: Unlocks;
  totalGold: number;
  totalKills: number;
  mode: GameMode;
  time: number;
  onBuyPrestige: (item: PrestigeItem) => void;
  onRestart: () => void;
  onHome: () => void;
}

export function GameOver({
  score,
  round,
  coins,
  prestige,
  earnedPrestige,
  unlocks,
  totalGold,
  totalKills,
  mode,
  time,
  onBuyPrestige,
  onRestart,
  onHome,
}: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center bg-slate-950/90 backdrop-blur-sm rounded-xl gap-3 text-center px-6 overflow-y-auto py-6">
      <div className="text-5xl">💀</div>
      <h2 className="text-4xl font-extrabold text-rose-400 tracking-tight">Game Over</h2>
      <p className="text-slate-300 text-sm">Your slime has fallen in the depths.</p>

      <div className="flex items-center gap-5 mt-1">
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Final Score</span>
          <span className="text-2xl font-bold text-amber-300">{score}</span>
        </div>
        <div className="w-px h-9 bg-slate-700" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            {mode === 'endless' ? 'Survived' : 'Highest Round'}
          </span>
          <span className="text-2xl font-bold text-violet-300">{mode === 'endless' ? `${time}s` : round}</span>
        </div>
        {mode !== 'endless' && (
          <>
            <div className="w-px h-9 bg-slate-700" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Coins</span>
              <span className="text-2xl font-bold text-amber-300">{coins}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 px-4 py-2 rounded-xl bg-slate-900/70 ring-1 ring-slate-700/60 flex items-center gap-3 text-xs">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">All-Time</span>
        <span className="flex items-center gap-1 text-amber-300 font-semibold">💰 {totalGold.toLocaleString()}</span>
        <span className="w-px h-3.5 bg-slate-700" />
        <span className="flex items-center gap-1 text-rose-300 font-semibold">☠️ {totalKills.toLocaleString()} slain</span>
      </div>

      <div className="mt-2 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-lg">
          ✨ {prestige} Prestige
          {earnedPrestige > 0 && <span className="text-emerald-400 text-xs font-semibold">(+{earnedPrestige} earned)</span>}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Earn 1 prestige for every 10 rounds survived. Spend it on permanent upgrades that carry across runs.
        </p>
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          {PRESTIGE_ITEMS.map((item) => {
            const level = (unlocks && +unlocks[item.key]) || 0;
            const maxed = level >= item.max;
            const cost = prestigeCost(item, level);
            const affordable = prestige >= cost && !maxed;
            return (
              <button
                key={item.key}
                onClick={() => onBuyPrestige(item)}
                disabled={!affordable}
                className={`text-left p-2.5 rounded-xl border transition ${
                  maxed
                    ? 'bg-emerald-900/40 border-emerald-700/50 cursor-default'
                    : affordable
                      ? 'bg-slate-800 hover:bg-slate-700 border-amber-700/50 hover:border-amber-500'
                      : 'bg-slate-800/50 border-slate-700/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{item.icon}</span>
                  <span className={`text-[10px] font-semibold ${maxed ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {maxed ? 'MAX' : `Lv ${level}/${item.max}`}
                  </span>
                </div>
                <div className="font-semibold text-slate-100 text-xs mt-1">{item.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{item.desc}</div>
                <div className={`text-xs font-semibold mt-1 ${maxed ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {maxed ? 'Maxed out' : `${cost} ✨`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={onRestart}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-white text-lg font-bold shadow-lg transition"
        >
          ↻ Play Again
        </button>
        <button
          onClick={onHome}
          className="px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
        >
          🏠 Home
        </button>
      </div>
    </div>
  );
}
