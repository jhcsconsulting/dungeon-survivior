import type { AgentMessage } from '../game/agents';
import { Markdown } from './Markdown';

interface PanelProps {
  messages: AgentMessage[];
  loading: boolean;
  open: boolean;
  onToggle: () => void;
}

export function NarratorPanel({ messages, loading, open, onToggle }: PanelProps) {
  const shown = messages.filter((m) => m.role === 'assistant' && m.content).slice(-6);
  return (
    <div className="fixed right-3 bottom-3 z-40 w-72 max-w-[82vw]">
      <div className="rounded-xl bg-slate-900/90 ring-1 ring-violet-700/50 shadow-2xl overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-violet-200 hover:bg-slate-800/60 transition"
        >
          <span className="flex items-center gap-2">📖 Narrator</span>
          <span>{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="px-3 pb-3 pt-1 max-h-56 overflow-y-auto space-y-2 text-sm">
            {loading && shown.length === 0 && <p className="text-slate-400 italic animate-pulse">The dungeon stirs…</p>}
            {shown.length === 0 && !loading && (
              <p className="text-slate-400 italic">Your tale begins on the next floor…</p>
            )}
            {shown.map((m, i) => (
              <div
                key={i}
                className={
                  i === shown.length - 1
                    ? 'leading-snug text-slate-100 border-l-2 border-violet-500/60 pl-2'
                    : 'leading-snug text-slate-400'
                }
              >
                <Markdown>{m.content}</Markdown>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CompanionPanel({ messages, loading, open, onToggle }: PanelProps) {
  const shown = messages.filter((m) => m.role === 'assistant' && m.content).slice(-4);
  return (
    <div className="fixed left-3 bottom-3 z-40 w-72 max-w-[82vw]">
      <div className="rounded-xl bg-slate-900/90 ring-1 ring-emerald-600/50 shadow-2xl overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-slate-800/60 transition"
        >
          <span className="flex items-center gap-2">🌟 Companion</span>
          <span>{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="px-3 pb-3 pt-1 max-h-48 overflow-y-auto space-y-2 text-sm">
            {loading && shown.length === 0 && (
              <p className="text-slate-400 italic animate-pulse">Your companion gathers courage…</p>
            )}
            {shown.length === 0 && !loading && (
              <p className="text-slate-400 italic">Your companion cheers you on as you descend…</p>
            )}
            {shown.map((m, i) => (
              <div
                key={i}
                className={
                  i === shown.length - 1
                    ? 'leading-snug text-slate-100 border-l-2 border-emerald-500/60 pl-2'
                    : 'leading-snug text-slate-400'
                }
              >
                <Markdown>{m.content}</Markdown>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
