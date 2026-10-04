import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAgentConversation } from '../game/agents';
import { Markdown } from './Markdown';

const CONTROLS = [
  { icon: '🕹️', key: 'WASD / Arrows', desc: 'Move your slime' },
  { icon: '⚔️', key: 'Space', desc: 'Sword swing' },
  { icon: '🏹', key: 'F', desc: 'Fire bow (aim with mouse)' },
  { icon: '💨', key: 'Shift', desc: 'Dash (damage + knockback)' },
  { icon: '🔮', key: '2', desc: 'Directional shield' },
  { icon: '✨', key: 'Power-ups', desc: 'Walk over to collect' },
  { icon: '🚪', key: 'Door', desc: 'Clear room → shop' },
  { icon: '👹', key: 'Boss', desc: 'Every 5 rounds' },
];

const QUICK_QUESTIONS = ['How do I fight?', 'What are power-ups?', 'How does the shop work?', 'Tell me about the boss'];

interface Props {
  onReady: () => void;
}

export function TutorialScreen({ onReady }: Props) {
  const { messages, loading, send } = useAgentConversation('dungeon_tutor');
  const [draft, setDraft] = useState('');
  const greeted = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    send("I'm new here. Walk me through how to play, one step at a time, and tell me when to press the I'm Ready button.");
  }, [send]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, loading]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim()) {
      send(draft.trim());
      setDraft('');
    }
  };

  const typing = loading && messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-violet-950 via-slate-950 to-black p-4">
      <div className="w-full max-w-4xl bg-slate-900/80 ring-1 ring-violet-800/60 rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-2">
        <div className="p-6 border-b md:border-b-0 md:border-r border-slate-700/60 bg-slate-900/60">
          <div className="text-4xl mb-1">🟢</div>
          <h2 className="text-2xl font-extrabold text-emerald-300">How to Play</h2>
          <p className="text-sm text-slate-400 mt-1 mb-4">A quick briefing before you descend.</p>
          <div className="grid grid-cols-1 gap-2">
            {CONTROLS.map((c) => (
              <div
                key={c.key}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/60 ring-1 ring-slate-700/50"
              >
                <span className="text-xl">{c.icon}</span>
                <span className="text-xs font-bold text-violet-200 w-28 shrink-0">{c.key}</span>
                <span className="text-xs text-slate-300">{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col p-6 min-h-[320px] max-h-[72vh]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🧙</span>
            <div>
              <h3 className="font-bold text-violet-200">Tutorial Guide</h3>
              <p className="text-[11px] text-slate-400">Ask anything before you start.</p>
            </div>
          </div>
          <div ref={scroller} className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && !loading && (
              <p className="text-sm text-slate-400 italic">Connecting to your guide…</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    m.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-200 ring-1 ring-slate-700'
                  }`}
                >
                  <Markdown>{m.content}</Markdown>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl text-sm bg-slate-800 text-slate-400 italic animate-pulse ring-1 ring-slate-700">
                  Guide is typing…
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 ring-1 ring-slate-700 transition"
              >
                {q}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex gap-2 mt-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask the guide…"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 ring-1 ring-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-violet-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold transition"
            >
              Send
            </button>
          </form>
          <button
            onClick={onReady}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-white text-lg font-bold shadow-lg transition"
          >
            I'm Ready! ⚔️
          </button>
        </div>
      </div>
    </div>
  );
}
