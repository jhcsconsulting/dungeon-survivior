import type { Purchase } from '../game/purchases';
import { buildShopList, shopCost } from '../game/shop';

interface Props {
  coins: number;
  round: number;
  hasBow: boolean;
  arrows: number;
  hasFlame: boolean;
  hasElectric: boolean;
  fuel: number;
  levels: Record<string, number>;
  onBuy: (purchase: Purchase) => void;
  onNext: () => void;
}

export function Shop({ coins, round, hasBow, arrows, hasFlame, hasElectric, fuel, levels, onBuy, onNext }: Props) {
  const levelOf = (key: string) => (levels && levels[key]) || 0;
  const items = buildShopList({ hasBow, hasFlame, hasElectric, levels });

  return (
    <div className="w-full max-w-2xl p-6 bg-slate-900 rounded-2xl ring-1 ring-violet-800/60 shadow-2xl max-h-[500px] overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-violet-200">🛒 Slime Shop</h2>
        <span className="flex items-center gap-1 text-amber-300 font-semibold">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400" /> {coins} coins
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-400 mb-4">
        <span>Round {round} cleared — spend your coins, then descend deeper.</span>
        {hasBow && <span className="text-sky-300">🏹 {arrows} arrows</span>}
        {hasFlame && <span className="text-orange-300">🔥 {fuel} fuel</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {items.map((item) => {
          const level = levelOf(item.key);
          const maxed = level >= item.max;
          const cost = shopCost(item, level);
          const affordable = coins >= cost && !maxed;
          const badge = maxed ? 'MAX' : item.max === Infinity ? `x${level}` : `${level}/${item.max}`;
          return (
            <button
              key={item.key}
              onClick={() => {
                if (affordable) onBuy({ key: item.key, cost });
              }}
              disabled={!affordable}
              className={`text-left p-3 rounded-xl border transition ${
                affordable
                  ? 'bg-slate-800 hover:bg-slate-700 border-violet-700/50 hover:border-violet-500'
                  : 'bg-slate-800/50 border-slate-700/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{item.icon}</span>
                <span className={`text-[10px] font-semibold ${maxed ? 'text-emerald-400' : 'text-slate-400'}`}>{badge}</span>
              </div>
              <div className="font-semibold text-slate-100 text-sm mt-1">{item.name}</div>
              <div className="text-xs text-slate-400">{item.desc}</div>
              <div className={`text-xs font-semibold mt-1 ${maxed ? 'text-emerald-400' : 'text-amber-300'}`}>
                {maxed ? 'Maxed out' : `${cost} coins`}
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition"
      >
        Descend to Round {round + 1} →
      </button>
    </div>
  );
}
