import type { LevelUpgrade } from '../game/types';

interface Props {
  level: number;
  choices: LevelUpgrade[];
  onPick: (choice: LevelUpgrade) => void;
}

export function LevelUp({ level, choices, onPick }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm rounded-xl gap-4 text-center px-6 py-6 overflow-y-auto">
      <div className="text-4xl">⬆️</div>
      <h2 className="text-3xl font-extrabold text-amber-300 drop-shadow">Level {level}!</h2>
      <p className="text-slate-300 text-sm">Choose an upgrade to power up your slime.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {choices.map((c, i) => (
          <button
            key={i}
            onClick={() => onPick(c)}
            className="text-left p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-700/50 hover:border-amber-500 transition flex flex-col gap-1.5"
          >
            <span className="text-2xl">{c.icon}</span>
            <span className="font-semibold text-slate-100 text-sm">{c.name}</span>
            <span className="text-xs text-slate-400 leading-tight">{c.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
