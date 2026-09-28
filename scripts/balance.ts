/**
 * Headless balance harness. Plays N campaigns per scenario with naive strategies and
 * reports the sack rate. Target for random play is roughly 1 in 4 — frequent enough to
 * feel real, rare enough that gambling is still worth it.
 *
 *   npm run balance -- 10000
 *   npm run balance -- 1000 parliamentary-harwell
 */
import { scenarios } from "../src/lib/content/index.js";
import type { Content } from "../src/lib/schema/content.js";
import {
  applyMove,
  createGame,
  forecastAction,
  isAvailable,
  isUnlocked,
  runElection,
} from "../src/lib/sim/engine.js";
import { nextRandom } from "../src/lib/sim/rng.js";
import type { GameState, PlayerMove } from "../src/lib/sim/types.js";

const runs = Number(process.argv[2] ?? 5000);
const only = process.argv[3];

if (only && !scenarios[only]) {
  console.error(
    `Unknown scenario "${only}". Try: ${Object.keys(scenarios).join(", ")}`,
  );
  process.exit(1);
}

type Strategy = (state: GameState, pick: number) => PlayerMove;

function makeStrategies(content: Content) {
  const groupIds = content.groups.map((g) => g.id);
  const byId = (id: string) => content.actions.find((a) => a.id === id)!;
  const pickGroup = (pick: number) =>
    groupIds[Math.floor(pick * groupIds.length)];

  function use(state: GameState, id: string, pick: number): PlayerMove | null {
    const action = byId(id);
    if (!isAvailable(state, action)) return null;
    return {
      kind: "action",
      actionId: id,
      target: action.targeted ? pickGroup(pick) : undefined,
    };
  }

  const fallback = (pick: number): PlayerMove => ({
    kind: "action",
    actionId: "doorstep",
    target: pickGroup(pick),
  });

  const strategies: Record<string, Strategy> = {
    random: (state, pick) => {
      const available = content.actions.filter(
        (a) => a.pollMargin === undefined && isAvailable(state, a),
      );
      const action = available[Math.floor(pick * available.length)];
      if (!action) return fallback(pick);
      return {
        kind: "action",
        actionId: action.id,
        target: action.targeted ? pickGroup(pick) : undefined,
      };
    },
    randomIncludingPolls: (state, pick) => {
      const available = content.actions.filter((a) => isAvailable(state, a));
      const action = available[Math.floor(pick * available.length)];
      if (!action) return fallback(pick);
      return {
        kind: "action",
        actionId: action.id,
        target: action.targeted ? pickGroup(pick) : undefined,
      };
    },
    pollWise: (state, pick) => {
      if (state.pollReport?.availableOnDay === state.day) {
        const forecasts = content.actions
          .filter((action) => isAvailable(state, action))
          .map((action) => ({
            action,
            forecast: forecastAction(
              state,
              content,
              action,
              action.targeted ? pickGroup(pick) : undefined,
            ),
          }))
          .filter((item) => item.forecast !== null)
          .sort((a, b) => b.forecast!.share - a.forecast!.share);
        const best = forecasts[0]?.action;
        if (best) {
          return {
            kind: "action",
            actionId: best.id,
            target: best.targeted ? pickGroup(pick) : undefined,
          };
        }
      }
      if (
        state.day === 1 &&
        !state.history.some(
          (move) => move.kind === "action" && move.actionId === "fullPoll",
        )
      ) {
        return { kind: "action", actionId: "fullPoll" };
      }
      return strategies.balanced(state, pick);
    },
    allAttack: (state, pick) => use(state, "attackAd", pick) ?? fallback(pick),
    /** Hammers the scenario's first-listed group. */
    allDoorstep: () => ({
      kind: "action",
      actionId: "doorstep",
      target: groupIds[0],
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

  return { strategies, byId, fallback };
}

function playOne(content: Content, strategy: Strategy, seed: number) {
  const { byId, fallback } = makeStrategies(content);
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

for (const content of Object.values(scenarios)) {
  if (only && content.contract.id !== only) continue;
  const { strategies } = makeStrategies(content);

  console.log(
    `\n${content.contract.id} — ${content.contract.days} days (${runs} campaigns per strategy)\n`,
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
      const result = playOne(content, strategy, i * 7919 + 13);
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
}

console.log(
  `\nRandom excludes polls for comparison with the prior baseline; randomIncludingPolls shows the cost of commissioning without using information.\n`,
);
