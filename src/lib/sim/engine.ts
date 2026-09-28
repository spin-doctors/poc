import type {
  Content,
  Effect,
  GameAction,
  GameEvent,
  Requirement,
  VoterGroup,
} from "../schema/content";
import { nextRandom, randomRange } from "./rng";
import type {
  ElectionResult,
  FeedbackLine,
  GaffeReport,
  GameState,
  GroupResult,
  MoveResult,
  ObjectiveResult,
  PlayerMove,
  PollForecast,
} from "./types";

const MORALE_GAFFE_THRESHOLD = 30;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function createGame(content: Content, seed: number): GameState {
  const support: Record<string, number> = {};
  const turnout: Record<string, number> = {};
  for (const group of content.groups) {
    support[group.id] = group.baseSupport;
    turnout[group.id] = 0;
  }
  return {
    seed,
    rngState: seed,
    day: 1,
    money: content.contract.budget,
    morale: content.contract.startingMorale,
    credibility: content.contract.startingCredibility,
    ruthlessness: content.contract.startingRuthlessness,
    personalFunds: content.contract.personalFunds,
    pollAccuracy: 0,
    support,
    turnout,
    pollReport: null,
    positions: {},
    pendingEventId: null,
    history: [],
    finished: false,
  };
}

function findGroup(content: Content, id: string): VoterGroup | undefined {
  return content.groups.find((g) => g.id === id);
}

/** Spin lands harder on the credulous. 50 gullibility is neutral. */
function spinScale(group: VoterGroup): number {
  return group.gullibility / 50;
}

const GLOBAL_STATS = {
  morale: { label: "Candidate morale", min: 0, max: 100 },
  credibility: { label: "Your credibility", min: 0, max: 100 },
  ruthlessness: { label: "Your reputation for ruthlessness", min: 0, max: 100 },
  pollAccuracy: { label: "Polling accuracy", min: 0, max: 2.5 },
  money: { label: "Budget", min: 0, max: Infinity },
  personalFunds: { label: "Your personal funds", min: 0, max: Infinity },
} as const;

type GlobalStat = keyof typeof GLOBAL_STATS;

function isGlobal(stat: Effect["stat"]): stat is GlobalStat {
  return stat in GLOBAL_STATS;
}

function applyEffects(
  state: GameState,
  content: Content,
  effects: Effect[],
  targetId?: string,
): { state: GameState; feedback: FeedbackLine[] } {
  const support = { ...state.support };
  const turnout = { ...state.turnout };
  const globals: Record<GlobalStat, number> = {
    morale: state.morale,
    credibility: state.credibility,
    ruthlessness: state.ruthlessness,
    pollAccuracy: state.pollAccuracy,
    money: state.money,
    personalFunds: state.personalFunds,
  };
  const feedback: FeedbackLine[] = [];

  for (const effect of effects) {
    if (isGlobal(effect.stat)) {
      const spec = GLOBAL_STATS[effect.stat];
      const before = globals[effect.stat];
      globals[effect.stat] = clamp(before + effect.delta, spec.min, spec.max);
      feedback.push({
        groupId: null,
        label: spec.label,
        stat: effect.stat,
        delta: round1(globals[effect.stat] - before),
        certain: true,
      });
      continue;
    }

    const targets =
      effect.on === "all"
        ? content.groups
        : effect.on === "target"
          ? content.groups.filter((g) => g.id === targetId)
          : content.groups.filter((g) => g.id === effect.on);

    for (const group of targets) {
      const delta = effect.spin
        ? effect.delta * spinScale(group)
        : effect.delta;
      if (effect.stat === "support") {
        const before = support[group.id];
        support[group.id] = clamp(before + delta, 0, 100);
        feedback.push({
          groupId: group.id,
          label: group.name,
          stat: "support",
          delta: round1(support[group.id] - before),
          certain: true,
        });
      } else {
        const before = turnout[group.id];
        turnout[group.id] = clamp(before + delta, -40, 40);
        feedback.push({
          groupId: group.id,
          label: `${group.name} — likelihood of actually voting`,
          stat: "turnout",
          delta: round1(turnout[group.id] - before),
          certain: false,
        });
      }
    }
  }

  return { state: { ...state, support, turnout, ...globals }, feedback };
}

/** Merges repeated hits on the same group/stat so the player sees one number per line. */
function condense(feedback: FeedbackLine[]): FeedbackLine[] {
  const merged = new Map<string, FeedbackLine>();
  for (const line of feedback) {
    const key = `${line.groupId ?? "global"}:${line.stat}`;
    const existing = merged.get(key);
    if (existing) existing.delta = round1(existing.delta + line.delta);
    else merged.set(key, { ...line });
  }
  return [...merged.values()].filter((line) => line.delta !== 0);
}

function rollGaffe(
  state: GameState,
  content: Content,
): { state: GameState; gaffe: GaffeReport | null } {
  if (state.morale >= MORALE_GAFFE_THRESHOLD || content.gaffes.length === 0) {
    return { state, gaffe: null };
  }
  const chance = (MORALE_GAFFE_THRESHOLD - state.morale) / 60;
  const roll = nextRandom(state.rngState);
  let working = { ...state, rngState: roll.state };
  if (roll.value >= chance) return { state: working, gaffe: null };

  const pick = nextRandom(working.rngState);
  working = { ...working, rngState: pick.state };
  const headline =
    content.gaffes[Math.floor(pick.value * content.gaffes.length)];

  const applied = applyEffects(working, content, [
    { on: "all", stat: "support", delta: -6, spin: false },
    { on: "all", stat: "morale", delta: -5, spin: false },
  ]);

  return {
    state: applied.state,
    gaffe: { headline, feedback: condense(applied.feedback) },
  };
}

function eventForDay(content: Content, day: number): GameEvent | undefined {
  return content.events.find((e) => e.day === day);
}

function advance(state: GameState, content: Content): GameState {
  const day = state.day + 1;
  const pollReport =
    state.pollReport && state.day >= state.pollReport.availableOnDay
      ? null
      : state.pollReport;
  return { ...state, day, pollReport, finished: day > content.contract.days };
}

export function canAfford(state: GameState, action: GameAction): boolean {
  return state.money >= action.cost;
}

/** Locked actions are still shown to the player, so these read as goals not errors. */
export function unmetRequirements(
  state: GameState,
  action: GameAction,
): Requirement[] {
  return action.requires.filter((r) => state[r.stat] < r.min);
}

export function isUnlocked(state: GameState, action: GameAction): boolean {
  return unmetRequirements(state, action).length === 0;
}

export function isAvailable(state: GameState, action: GameAction): boolean {
  return canAfford(state, action) && isUnlocked(state, action);
}

export function applyMove(
  state: GameState,
  content: Content,
  move: PlayerMove,
): MoveResult {
  if (state.finished) throw new Error("Campaign is over");

  if (move.kind === "respond") {
    if (state.pendingEventId !== move.eventId)
      throw new Error("No such pending event");
    const event = content.events.find((e) => e.id === move.eventId);
    if (!event) throw new Error(`Unknown event: ${move.eventId}`);
    const response = event.responses[move.responseIndex];
    if (!response) throw new Error("Invalid response index");
    if (
      (response.next && !content.events.some((e) => e.id === response.next)) ||
      (response.nextDay &&
        !content.events.some((e) => e.id === response.nextDay))
    ) {
      throw new Error(
        `Unknown chained event: ${response.next ?? response.nextDay}`,
      );
    }

    const applied = applyEffects(state, content, response.effects);
    const gaffed = response.riskGaffe
      ? rollGaffe(applied.state, content)
      : { state: applied.state, gaffe: null };

    const positions = response.positionChange
      ? {
          ...gaffed.state.positions,
          [response.positionChange.issue]: response.positionChange.position,
        }
      : gaffed.state.positions;
    const responseState = { ...gaffed.state, positions };

    // Same-day chains keep the turn; next-day chains advance before queuing.
    const next = response.next
      ? { ...responseState, pendingEventId: response.next }
      : response.nextDay
        ? {
            ...advance({ ...responseState, pendingEventId: null }, content),
            pendingEventId: response.nextDay,
          }
        : advance({ ...responseState, pendingEventId: null }, content);

    return {
      state: { ...next, history: [...state.history, move] },
      flavour: response.flavour,
      feedback: condense(applied.feedback),
      gaffe: gaffed.gaffe,
      triggeredEventId: response.next ?? response.nextDay ?? null,
      pollCommissioned: false,
    };
  }

  if (state.pendingEventId) throw new Error("Respond to the scandal first");

  const action = content.actions.find((a) => a.id === move.actionId);
  if (!action) throw new Error(`Unknown action: ${move.actionId}`);
  if (action.pollMargin && state.day >= content.contract.days)
    throw new Error("There is no campaign day left to use this poll");
  if (action.targeted && !move.target)
    throw new Error(`${action.name} needs a target group`);
  if (action.targeted && !findGroup(content, move.target!))
    throw new Error("Unknown target group");
  if (!canAfford(state, action)) throw new Error("Not enough money");
  if (!isUnlocked(state, action))
    throw new Error(`${action.name} is not unlocked`);

  const paid = { ...state, money: state.money - action.cost };
  const applied = applyEffects(paid, content, action.effects, move.target);
  const gaffed = action.pollMargin
    ? { state: applied.state, gaffe: null }
    : rollGaffe(applied.state, content);
  const commissioned = action.pollMargin
    ? {
        ...gaffed.state,
        pollReport: {
          availableOnDay: state.day + 1,
          margin: action.pollMargin,
        },
      }
    : gaffed.state;

  const event = eventForDay(content, state.day);
  const afterEvent = event
    ? { ...commissioned, pendingEventId: event.id }
    : advance(commissioned, content);

  return {
    state: { ...afterEvent, history: [...state.history, move] },
    flavour: action.flavour,
    feedback: condense(applied.feedback),
    gaffe: gaffed.gaffe,
    triggeredEventId: event?.id ?? null,
    pollCommissioned: Boolean(action.pollMargin),
  };
}

/**
 * The published poll. Deterministic per day, but deliberately wrong by a few points —
 * the player should never be certain they've done enough.
 */
export function pollEstimate(
  state: GameState,
  content: Content,
): { share: number; margin: number } {
  let votes = 0;
  let ours = 0;
  for (const group of content.groups) {
    const turnoutPct = clamp(
      group.baseTurnout + state.turnout[group.id],
      0,
      100,
    );
    const cast = group.size * (turnoutPct / 100);
    votes += cast;
    ours += cast * (state.support[group.id] / 100);
  }
  const truth = votes === 0 ? 0 : (ours / votes) * 100;
  const margin = round1(Math.max(0.5, 3 - state.pollAccuracy));
  const noise = randomRange(
    state.seed + state.day * 7919,
    -margin,
    margin,
  ).value;
  const unanimous = content.groups.every(
    (group) => state.support[group.id] >= 100,
  );
  return {
    share: unanimous ? 100 : round1(clamp(truth + noise, 0, 100)),
    margin,
  };
}

function expectedVoteShare(state: GameState, content: Content): number {
  let votes = 0;
  let ours = 0;
  for (const group of content.groups) {
    const enthusiasm = (state.support[group.id] - group.baseSupport) * 0.15;
    const turnoutPct = clamp(
      group.baseTurnout + state.turnout[group.id] + enthusiasm,
      0,
      100,
    );
    const cast = group.size * (turnoutPct / 100);
    votes += cast;
    ours += cast * (state.support[group.id] / 100);
  }
  return round1(votes === 0 ? 0 : (ours / votes) * 100);
}

/** Projects the central estimate for an action without spending or mutating the state. */
export function forecastAction(
  state: GameState,
  content: Content,
  action: GameAction,
  targetId?: string,
): PollForecast | null {
  if (
    !state.pollReport ||
    state.pollReport.availableOnDay !== state.day ||
    action.pollMargin ||
    !isAvailable(state, action)
  ) {
    return null;
  }
  const projected = applyEffects(
    state,
    content,
    action.effects,
    targetId,
  ).state;
  return {
    share: expectedVoteShare(projected, content),
    margin: state.pollReport.margin,
  };
}

export function runElection(
  state: GameState,
  content: Content,
): ElectionResult {
  let rngState = state.rngState;
  const groups: GroupResult[] = [];
  let totalVotes = 0;
  let ourVotes = 0;

  for (const group of content.groups) {
    // Enthusiasm nudges turnout: people who like you are likelier to show up.
    const enthusiasm = (state.support[group.id] - group.baseSupport) * 0.15;
    const noise = randomRange(rngState, -4, 4);
    rngState = noise.state;

    const turnoutPct = clamp(
      group.baseTurnout + state.turnout[group.id] + enthusiasm + noise.value,
      0,
      100,
    );
    const votesCast = Math.round(group.size * (turnoutPct / 100));
    const votesForUs = Math.round(votesCast * (state.support[group.id] / 100));

    totalVotes += votesCast;
    ourVotes += votesForUs;
    groups.push({
      groupId: group.id,
      name: group.name,
      support: round1(state.support[group.id]),
      turnoutPct: round1(turnoutPct),
      votesCast,
      votesForUs,
    });
  }

  const voteShare =
    totalVotes === 0 ? 0 : round1((ourVotes / totalVotes) * 100);
  const objectives: ObjectiveResult[] = content.contract.objectives.map(
    (objective) => {
      const actual =
        objective.stat === "voteShare" ? voteShare : round1(state.morale);
      return {
        id: objective.id,
        label: objective.label,
        target: objective.target,
        actual,
        met: actual >= objective.target,
      };
    },
  );

  return {
    groups,
    totalVotes,
    ourVotes,
    voteShare,
    morale: round1(state.morale),
    objectives,
    sacked: objectives.some((o) => !o.met),
  };
}

/** Seed + move list fully reconstructs a campaign. This is the save format. */
export function replay(
  content: Content,
  seed: number,
  moves: PlayerMove[],
): GameState {
  let state = createGame(content, seed);
  for (const move of moves) state = applyMove(state, content, move).state;
  return state;
}
