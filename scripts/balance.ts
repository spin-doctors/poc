/**
 * Headless balance harness. Plays N campaigns with naive strategies and reports the
 * sack rate. Target for a first playthrough is roughly 1 in 4 — frequent enough to
 * feel real, rare enough that gambling is still worth it.
 *
 *   npm run balance -- 10000
 */
import { content } from "../src/lib/content/index.js";
import {
  applyMove,
  createGame,
  isAvailable,
  isUnlocked,
  runElection,
} from "../src/lib/sim/engine.js";
import { nextRandom } from "../src/lib/sim/rng.js";
import type { GameState, PlayerMove } from "../src/lib/sim/types.js";

const runs = Number(process.argv[2] ?? 5000);

type Strategy = (state: GameState, pick: number) => PlayerMove;

const groupIds = content.groups.map((g) => g.id);
const byId = (id: string) => content.actions.find((a) => a.id === id)!;

function use(state: GameState, id: string, pick: number): PlayerMove | null {
  const action = byId(id);
  if (!isAvailable(state, action)) return null;
  return {
    kind: "action",
    actionId: id,
    target: action.targeted
      ? groupIds[Math.floor(pick * groupIds.length)]
      : undefined,
  };
}

const fallback = (pick: number): PlayerMove => ({
  kind: "action",
  actionId: "doorstep",
  target: groupIds[Math.floor(pick * groupIds.length)],
});

const strategies: Record<string, Strategy> = {
  random: (state, pick) => {
    const available = content.actions.filter((a) => isAvailable(state, a));
    const action = available[Math.floor(pick * available.length)];
    if (!action) return fallback(pick);
    return {
      kind: "action",
      actionId: action.id,
      target: action.targeted
        ? groupIds[Math.floor(pick * groupIds.length)]
        : undefined,
    };
  },
  allAttack: (state, pick) => use(state, "attackAd", pick) ?? fallback(pick),
  allDoorstep: () => ({
    kind: "action",
    actionId: "doorstep",
    target: "commuters",
  }),
  balanced: (state, pick) => {
    if (state.morale < 40) return { kind: "action", actionId: "debatePrep" };
    return use(state, "photoOp", pick) ?? fallback(pick);
  },
  /** Builds credibility early, then cashes it in for inside information. */
  cleanHands: (state, pick) => {
    const inside = use(state, "insideTrack", pick);
    if (inside) return inside;
    if (state.morale < 45) return { kind: "action", actionId: "debatePrep" };
    return fallback(pick);
  },
  /** Builds ruthlessness early, then starts throwing dead cats. Rests when the candidate cracks. */
  bareKnuckle: (state, pick) => {
    if (state.morale < 40) return { kind: "action", actionId: "debatePrep" };
    return (
      use(state, "deadCat", pick) ??
      use(state, "attackAd", pick) ??
      fallback(pick)
    );
  },
};

function playOne(strategy: Strategy, seed: number) {
  let state = createGame(content, seed);
  let rng = seed ^ 0x9e3779b9;
  const reached = { insideTrack: false, deadCat: false };

  while (!state.finished) {
    const roll = nextRandom(rng);
    rng = roll.state;

    for (const id of ["insideTrack", "deadCat"] as const) {
      if (isUnlocked(state, byId(id))) reached[id] = true;
    }

    let move: PlayerMove;
    if (state.pendingEventId) {
      const pending = content.events.find(
        (e) => e.id === state.pendingEventId,
      )!;
      move = {
        kind: "respond",
        eventId: pending.id,
        responseIndex: Math.floor(roll.value * pending.responses.length),
      };
    } else {
      move = strategy(state, roll.value);
    }

    try {
      state = applyMove(state, content, move).state;
    } catch {
      state = applyMove(state, content, fallback(roll.value)).state;
    }
  }
  return { ...runElection(state, content), reached };
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

console.log(
  `\nSpin Doctors — balance report (${runs} campaigns per strategy)\n`,
);
console.log(
  [
    "strategy",
    "sacked",
    "mean share",
    "p10",
    "p25",
    "p90",
    "morale",
    "inside",
    "deadcat",
  ].join("\t"),
);

for (const [name, strategy] of Object.entries(strategies)) {
  const shares: number[] = [];
  let sacked = 0;
  let moraleTotal = 0;
  let inside = 0;
  let deadCat = 0;

  for (let i = 0; i < runs; i++) {
    const result = playOne(strategy, i * 7919 + 13);
    shares.push(result.voteShare);
    moraleTotal += result.morale;
    if (result.sacked) sacked++;
    if (result.reached.insideTrack) inside++;
    if (result.reached.deadCat) deadCat++;
  }

  shares.sort((a, b) => a - b);
  const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
  console.log(
    [
      name.padEnd(12),
      pct(sacked / runs),
      mean.toFixed(1),
      shares[Math.floor(runs * 0.1)].toFixed(1),
      shares[Math.floor(runs * 0.25)].toFixed(1),
      shares[Math.floor(runs * 0.9)].toFixed(1),
      (moraleTotal / runs).toFixed(1),
      pct(inside / runs),
      pct(deadCat / runs),
    ].join("\t"),
  );
}

console.log(
  `\nTarget sack rate for naive play (random): 20-30%. Skilled play should beat it clearly.\n`,
);
