/**
 * Local stand-in for the Base44 AI agents the original app used (dungeon_narrator,
 * dungeon_companion, dungeon_tutor). Those ran on Base44's hosted LLM backend; this
 * module keeps the same conversation shape (user/assistant messages, loading state,
 * `send(prompt)`) but answers from scripted text so the game is fully self-contained.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type AgentName = 'dungeon_narrator' | 'dungeon_companion' | 'dungeon_tutor';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const BIOME_LINES: Record<string, string[]> = {
  'Stone Dungeon': [
    'Torchlight flickers across damp stone as you squelch into the hall. Something scrapes in the dark beyond the pillars.',
    'Ancient masonry groans overhead. The air tastes of rust and old battles, and the shadows here have teeth.',
  ],
  'Mossy Cave': [
    'Glowing mushrooms pulse softly along the cavern floor. The moss muffles your steps, but not the growls ahead.',
    'Water drips from a ceiling lost in emerald gloom. Every stalagmite could be hiding a hungry thing.',
  ],
  'Lava Cavern': [
    'Heat shimmers off rivers of molten rock. Your gel bubbles at the edges; best keep moving, little slime.',
    'Cracks in the floor glow angry orange. Embers drift upward like dying fireflies as the horde stirs.',
  ],
  'Ice Crypt': [
    'Frost crawls across every surface. Crystals chime faintly as your breath fogs the frozen air.',
    'The crypt is deathly silent, save for the crack of ice underfoot. Frozen eyes watch from the walls.',
  ],
  'Arcane Ruins': [
    'Runes spin lazily in the air, humming with forgotten power. Reality feels thin here.',
    'Violet light leaks from fractured sigils in the floor. Whatever the ancients summoned never left.',
  ],
};

const BOSS_LINES = [
  'A monstrous presence shakes the floor: the DUNGEON BOSS has found you. It heals as it hunts, so hit it hard and fast.',
  'The crowned horror of this level lumbers into view, spitting rings of fire. Dodge between the gaps and keep swinging.',
];

const TIPS = [
  'Tip: the shield (press 2) blocks projectiles only in the direction you face. Point it at the shooters.',
  'Tip: dashing (Shift) halves the damage you take and knocks enemies back. Use it to escape pile-ups.',
  'Tip: power-ups blink before they vanish. Grab the hearts when your HP bar turns red.',
  'Tip: buy the bow early and stock up on arrows. Kiting is life for a slime.',
  'Tip: ranged purple enemies keep their distance. Dash in or shoot them before they chip you down.',
  'Tip: every 5 rounds a boss appears. Spend coins on armor and max HP beforehand.',
  'Tip: a radioactive aura melts anything that touches you. Great against swarms of melee slimes.',
  'Tip: the Electric Zap arcs between nearby enemies. It shines when they bunch up.',
];

const CHEERS_START = [
  "Round {round}! You've got this, slime buddy. Clear every enemy and the shop door opens below.",
  'Here we go, round {round}! Stay mobile, swing often, and remember: no enemies left means shop time.',
  "Round {round} begins! I believe in you. Squash them all and we'll go spend those coins together.",
];

const CHEERS_BOSS = [
  "Round {round}, and that's a BOSS stomping around! Keep moving between its fire rings. Clear the room and the shop is yours.",
  'Boss floor, round {round}! Big and scary, but it still drops loot. Take it down with everything else and we descend.',
];

const CHEERS_CLEARED = [
  'Room cleared! Amazing work! The shop is next; grab something shiny before we go deeper.',
  'Not a single enemy left standing! Off to the shop, then down we go.',
  'You did it! Catch your breath, spend your coins wisely, and then we descend.',
];

const TUTOR_INTRO = `Welcome, brave slime! Here is how to survive the dungeon, one step at a time:

1. Move with WASD or the arrow keys. You are a blob, but a nimble one.
2. Press Space to swing your sword in the direction you face.
3. Hold Shift to dash. Dashing damages enemies, knocks them back and halves the damage you take.
4. Press 2 to raise a 3-second shield in front of you. It blocks projectiles and shoves enemies away.
5. Once you own a bow, aim with the mouse and press F to shoot. The flamethrower uses G.
6. Walk over glowing orbs to collect power-ups: health, speed, damage and arrows.
7. Clear every enemy in the room to open the shop, then descend to the next, harder round.
8. Every 5 rounds a boss guards the floor. Stock up on HP and armor first!

When you feel ready, press the "I'm Ready!" button and enter the dungeon.`;

const TUTOR_ANSWERS: { match: RegExp; answer: string }[] = [
  {
    match: /fight|attack|sword|combat|damage|kill/i,
    answer:
      'Press Space to swing your sword toward the direction you are facing. Hold Shift to dash through enemies for burst damage and knockback. With a bow, aim with the mouse and press F; with a flamethrower, hold G. The shield on 2 pushes melee enemies away and blocks projectiles in front of you.',
  },
  {
    match: /power.?up|orb|pick.?up|collect/i,
    answer:
      'Enemies sometimes drop glowing orbs. Walk over them to collect: red hearts heal 35 HP, cyan stars give 8s of speed, orange swords give 8s of +50% damage, and yellow arrows add 15 ammo. They blink before disappearing, so be quick!',
  },
  {
    match: /shop|buy|coin|upgrade|market/i,
    answer:
      'Every enemy drops coins. When the room is clear you descend to the Slime Shop, where coins buy permanent upgrades for this run: more HP, damage, speed, armor, regeneration, dash and shield cooldowns, the bow and arrows, a flamethrower, minions, a damaging aura and chain lightning. Prices rise with each level.',
  },
  {
    match: /boss/i,
    answer:
      'A boss appears every 5 rounds. It is large, slowly regenerates health, and fires rings of 12 projectiles every second. Weave between the gaps, use your shield to block, and dash in for heavy hits. Bosses always drop three power-ups.',
  },
  {
    match: /prestige|permanent|unlock/i,
    answer:
      'You earn 1 prestige for every 10 rounds survived (or every minute in Endless). On the game-over screen, prestige buys permanent bonuses such as extra HP, damage, speed, armor, regen, or starting with a bow or flamethrower.',
  },
  {
    match: /endless|mode|classic/i,
    answer:
      'Classic mode is waves of rooms with a shop between each. Endless World has no walls and no shop: enemies spawn forever, you gain XP for kills, and each level lets you pick one of three upgrades. Survive as long as you can!',
  },
  {
    match: /dash|shift/i,
    answer:
      'Press Shift to dash in the direction you are moving (or facing). It lasts a quarter second, deals dash damage to everything you pass through, knocks enemies back and halves incoming damage. It has a 15 second cooldown that the shop can shorten.',
  },
  {
    match: /shield|block/i,
    answer:
      'Press 2 to project a shield in front of you for 3 seconds. It destroys projectiles and pushes enemies away in that direction only, so face your shooters. The cooldown is 20 seconds, reducible in the shop.',
  },
  {
    match: /bow|arrow|ranged|shoot/i,
    answer:
      'Buy "Equip Bow" in the shop (or start with it via prestige). Aim with the mouse and press F to shoot. Arrows are limited ammo: buy more in the shop or grab yellow arrow power-ups. Multi Shot fires extra arrows per shot.',
  },
  {
    match: /enem|monster|slime|warp|tank/i,
    answer:
      'Red spiky slimes charge you. Purple casters keep their distance and shoot. Grey tanks are slow but tough and hit hard. Violet warpers teleport right next to you. And every 5th round brings a crowned boss.',
  },
];

function tutorReply(prompt: string): string {
  if (/walk me through|new here|how to play/i.test(prompt)) return TUTOR_INTRO;
  const hit = TUTOR_ANSWERS.find((a) => a.match.test(prompt));
  if (hit) return hit.answer;
  return pick([
    'Good question! In short: move with WASD, swing with Space, dash with Shift, shield with 2, and clear every enemy to reach the shop. Ask me about fighting, power-ups, the shop or the boss for details.',
    'Here is the core loop: survive the room, collect coins and power-ups, buy upgrades in the shop, descend. Press "I\'m Ready!" whenever you want to start.',
  ]);
}

function narratorReply(prompt: string): string {
  const round = /Round (\d+)/.exec(prompt)?.[1];
  const biome = /biome "([^"]+)"/.exec(prompt)?.[1];
  const boss = /BOSS/.test(prompt);
  const lines = (biome && BIOME_LINES[biome]) || BIOME_LINES['Stone Dungeon'];
  const parts = [`**Round ${round ?? '?'} — ${biome ?? 'the depths'}.** ${pick(lines)}`];
  if (boss) parts.push(pick(BOSS_LINES));
  parts.push(pick(TIPS));
  return parts.join(' ');
}

function companionReply(prompt: string): string {
  const round = /Round (\d+)/.exec(prompt)?.[1] ?? '?';
  if (/cleared/i.test(prompt)) return pick(CHEERS_CLEARED);
  const boss = /BOSS/.test(prompt);
  return pick(boss ? CHEERS_BOSS : CHEERS_START).replace('{round}', round);
}

export function generateReply(agent: AgentName, prompt: string): string {
  if (agent === 'dungeon_narrator') return narratorReply(prompt);
  if (agent === 'dungeon_companion') return companionReply(prompt);
  return tutorReply(prompt);
}

/** Same hook surface as the original Base44-backed `useAgentConversation`, answered locally. */
export function useAgentConversation(agent: AgentName) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);
  const pending = useRef(0);

  // Track mount state (rather than cancelling timers) so a reply requested during
  // React StrictMode's simulated remount is still delivered.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const send = useCallback(
    (content: string) => {
      setMessages((m) => [...m, { role: 'user', content }]);
      setLoading(true);
      pending.current += 1;
      const reply = generateReply(agent, content);
      window.setTimeout(
        () => {
          pending.current -= 1;
          if (!mounted.current) return;
          setMessages((m) => [...m, { role: 'assistant', content: reply }]);
          if (pending.current === 0) setLoading(false);
        },
        400 + Math.random() * 500,
      );
    },
    [agent],
  );

  return { messages, loading, send };
}
