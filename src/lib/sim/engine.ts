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
  CandidateStanding,
  ElectionResult,
  FeedbackLine,
  GaffeReport,
  GameState,
  GroupResult,
  MoveResult,
  ObjectiveResult,
  PlayerMove,
  PollForecast,
  PollReport,
  StartingStats,
} from "./types";

const MORALE_GAFFE_THRESHOLD = 30;
export const IDLE_MORALE_PENALTY = 5;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function defaultStart(content: Content): StartingStats {
  return {
    credibility: content.contract.startingCredibility,
    ruthlessness: content.contract.startingRuthlessness,
    personalFunds: content.contract.personalFunds,
  };
}

export function createGame(
  content: Content,
  seed: number,
  start: StartingStats = defaultStart(content),
): GameState {
  const support: Record<string, number> = {};
  const turnout: Record<string, number> = {};
  for (const group of content.groups) {
    support[group.id] = group.baseSupport;
    turnout[group.id] = 0;
  }
  return {
    seed,
    rngState: seed,
    start,
    day: 1,
    money: content.contract.budget,
    morale: content.contract.startingMorale,
    credibility: start.credibility,
    ruthlessness: start.ruthlessness,
    personalFunds: start.personalFunds,
    pollAccuracy: 0,
    support,
    rivalSupport: Object.fromEntries(
      content.rivals.map((r) => [r.id, { ...r.support }]),
    ),
    turnout,
    pollReport: null,
    pendingPoll: null,
    pollPurchasedOnDay: null,
    reports: [],
    news: [],
    positions: {},
    pendingEventId: null,
    queuedEventId: null,
    turnTaken: false,
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
  rivalId?: string,
): { state: GameState; feedback: FeedbackLine[] } {
  const support = { ...state.support };
  const rivalSupport = Object.fromEntries(
    Object.entries(state.rivalSupport).map(([id, shares]) => [
      id,
      { ...shares },
    ]),
  );
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
        const sources =
          delta > 0 && rivalId
            ? content.rivals.filter((r) => r.id === rivalId)
            : delta > 0
              ? content.rivals
              : content.rivals.filter((r) => !r.novelty);
        const available = sources.reduce(
          (sum, r) => sum + rivalSupport[r.id][group.id],
          0,
        );
        const change =
          delta > 0
            ? Math.min(delta, 100 - before, available)
            : -Math.min(-delta, before);
        const baseTotal = sources.reduce(
          (sum, s) => sum + s.support[group.id],
          0,
        );
        const weights = sources.map((r) =>
          available > 0
            ? rivalSupport[r.id][group.id] / available
            : baseTotal > 0
              ? r.support[group.id] / baseTotal
              : 1 / sources.length,
        );
        let remaining = change;
        sources.forEach((r, i) => {
          const transferred =
            i === sources.length - 1 ? remaining : change * weights[i];
          rivalSupport[r.id][group.id] = Math.max(
            0,
            rivalSupport[r.id][group.id] - transferred,
          );
          remaining -= transferred;
        });
        support[group.id] = clamp(before + change, 0, 100);
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

  return {
    state: { ...state, support, rivalSupport, turnout, ...globals },
    feedback,
  };
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

/** Closes the day. A campaign left without a finished move loses the day and some morale. */
export function endDay(state: GameState, content: Content): GameState {
  if (state.finished) throw new Error("Campaign is over");
  const morale = state.turnTaken
    ? state.morale
    : clamp(state.morale - IDLE_MORALE_PENALTY, 0, 100);
  const day = state.day + 1;
  const delivered = state.pendingPoll
    ? makePollReport(state, content, state.pendingPoll.margin, day)
    : null;
  const next: GameState = {
    ...state,
    morale,
    day,
    pollReport: delivered,
    pendingPoll: null,
    reports: delivered ? [...state.reports, delivered] : state.reports,
    pendingEventId: state.turnTaken ? state.queuedEventId : null,
    queuedEventId: null,
    turnTaken: false,
    finished: day > content.contract.days,
  };
  if (!state.turnTaken)
    next.news = [
      ...next.news,
      {
        id: `idle:${state.day}`,
        day: state.day,
        kind: "idle",
        headline: "Campaign diary left blank",
        body: `No completed move today. Candidate morale fell by ${state.morale - morale} points.`,
      },
    ];
  if (!next.finished) {
    const report = publicPoll(next, content);
    next.news = [
      ...next.news,
      {
        id: `poll:${day}`,
        day,
        kind: "poll",
        headline: "The morning numbers",
        body: `${report.standings.map((c) => `${c.name}: ${round1(c.share)}%`).join("; ")}. Estimates only, with up to ±${report.margin} points uncertainty (novelty contenders remain within 0–2%).`,
      },
    ];
    const queued = content.events.find((e) => e.id === next.pendingEventId);
    if (queued)
      next.news = [
        ...next.news,
        {
          id: `event:${day}:${queued.id}`,
          day,
          kind: "event",
          headline: queued.headline,
          body: queued.body,
        },
      ];
  }
  return next;
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

/** One move and its immediate day-end: the single-campaign flow used by replays and balance. */
export function applyMove(
  state: GameState,
  content: Content,
  move: PlayerMove,
): MoveResult {
  const result = playTurn(state, content, move);
  return move.kind !== "poll" && result.state.turnTaken
    ? { ...result, state: endDay(result.state, content) }
    : result;
}

/** Plays a move without ending the day; chained same-day events keep the turn open. */
export function playTurn(
  state: GameState,
  content: Content,
  move: PlayerMove,
): MoveResult {
  if (state.finished) throw new Error("Campaign is over");
  if (move.kind === "poll") {
    const action = content.actions.find((a) => a.id === move.actionId);
    if (!action?.pollMargin) throw new Error("Unknown poll product");
    if (state.day >= content.contract.days)
      throw new Error("There is no campaign day left to use this poll");
    if (state.pollPurchasedOnDay === state.day)
      throw new Error("A poll is already commissioned today");
    if (!canAfford(state, action)) throw new Error("Not enough money");
    if (!isUnlocked(state, action)) throw new Error("Poll is not unlocked");
    return {
      state: {
        ...state,
        money: state.money - action.cost,
        pendingPoll: { margin: action.pollMargin },
        pollPurchasedOnDay: state.day,
        history: [...state.history, move],
      },
      flavour: action.flavour,
      feedback: [],
      gaffe: null,
      triggeredEventId: null,
      pollCommissioned: true,
    };
  }
  if (state.turnTaken) throw new Error("Today's move is already done");

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

    const next = response.next
      ? { ...responseState, pendingEventId: response.next }
      : {
          ...responseState,
          pendingEventId: null,
          queuedEventId: response.nextDay ?? null,
          turnTaken: true,
        };
    const news = [...next.news];
    if (gaffed.gaffe)
      news.push({
        id: `gaffe:${state.history.length}`,
        day: state.day,
        kind: "gaffe",
        headline: gaffed.gaffe.headline,
        body: "An unguarded remark. The campaign is dealing with the fallout.",
      });
    const followUp = response.next
      ? content.events.find((e) => e.id === response.next)
      : null;
    if (followUp)
      news.push({
        id: `event:${state.day}:${followUp.id}`,
        day: state.day,
        kind: "event",
        headline: followUp.headline,
        body: followUp.body,
      });

    return {
      state: { ...next, news, history: [...state.history, move] },
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
  if (action.pollMargin)
    throw new Error("Commission polling as an additional poll move");
  if (action.targeting !== "none" && !move.target)
    throw new Error(`${action.name} needs a target`);
  if (action.targeting === "group" && !findGroup(content, move.target!))
    throw new Error("Unknown target group");
  if (
    action.targeting === "rival" &&
    !content.rivals.some((r) => r.id === move.target)
  )
    throw new Error("Unknown rival target");
  if (action.targeting === "none" && move.target)
    throw new Error("This action does not take a target");
  if (!canAfford(state, action)) throw new Error("Not enough money");
  if (!isUnlocked(state, action))
    throw new Error(`${action.name} is not unlocked`);

  const paid = { ...state, money: state.money - action.cost };
  const applied = applyEffects(
    paid,
    content,
    action.effects,
    action.targeting === "group" ? move.target : undefined,
    action.targeting === "rival" ? move.target : undefined,
  );
  const gaffed = action.pollMargin
    ? { state: applied.state, gaffe: null }
    : rollGaffe(applied.state, content);
  let commissioned = gaffed.state;
  if (gaffed.gaffe)
    commissioned = {
      ...commissioned,
      news: [
        ...commissioned.news,
        {
          id: `gaffe:${state.history.length}`,
          day: state.day,
          kind: "gaffe",
          headline: gaffed.gaffe.headline,
          body: "The candidate went off-script. The campaign is dealing with the fallout.",
        },
      ],
    };

  const event = eventForDay(content, state.day);
  let afterEvent = event
    ? { ...commissioned, pendingEventId: event.id }
    : { ...commissioned, turnTaken: true };
  if (event)
    afterEvent = {
      ...afterEvent,
      news: [
        ...afterEvent.news,
        {
          id: `event:${state.day}:${event.id}`,
          day: state.day,
          kind: "event",
          headline: event.headline,
          body: event.body,
        },
      ],
    };

  return {
    state: { ...afterEvent, history: [...state.history, move] },
    flavour: action.flavour,
    feedback: condense(applied.feedback),
    gaffe: gaffed.gaffe,
    triggeredEventId: event?.id ?? null,
    pollCommissioned: Boolean(action.pollMargin),
  };
}

function makePollReport(
  state: GameState,
  content: Content,
  margin: number,
  availableOnDay: number,
): PollReport {
  const candidates = [
    { id: "client", name: content.contract.candidateName, novelty: false },
    ...content.rivals,
  ];
  const groups = content.groups.map((group, groupIndex) => {
    const shares = candidates.map((candidate) =>
      candidate.id === "client"
        ? state.support[group.id]
        : state.rivalSupport[candidate.id][group.id],
    );
    if (!shares.includes(100)) {
      const step = margin / (candidates.length - 1);
      for (let i = 1; i < candidates.length; i++) {
        const noise = randomRange(
          state.seed + state.day * 7919 + groupIndex * 101 + i * 313,
          -step,
          step,
        ).value;
        const transfer = clamp(
          noise,
          -Math.min(shares[i], 100 - shares[0]),
          Math.min(shares[0], (candidates[i].novelty ? 2 : 100) - shares[i]),
        );
        shares[i] += transfer;
        shares[0] -= transfer;
      }
    }
    const standings: CandidateStanding[] = candidates.map((candidate, i) => ({
      id: candidate.id,
      name: candidate.name,
      share: shares[i],
      margin: candidate.novelty ? Math.min(2, margin) : margin,
    }));
    return { groupId: group.id, standings };
  });
  const weights = content.groups.map(
    (g) => g.size * clamp(g.baseTurnout + state.turnout[g.id], 0, 100),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  const standings = candidates.map((candidate, i) => ({
    id: candidate.id,
    name: candidate.name,
    share:
      total === 0
        ? 0
        : groups.reduce(
            (sum, g, j) => sum + g.standings[i].share * weights[j],
            0,
          ) / total,
    margin: candidate.novelty ? Math.min(2, margin) : margin,
  }));
  return {
    commissionedOnDay: state.day,
    availableOnDay,
    margin,
    standings,
    groups,
  };
}

export function publicPoll(state: GameState, content: Content): PollReport {
  return makePollReport(
    state,
    content,
    Math.max(0.5, 3 - state.pollAccuracy),
    state.day,
  );
}

/**
 * The published poll. Deterministic per day, but deliberately wrong by a few points —
 * the player should never be certain they've done enough.
 */
export function pollEstimate(
  state: GameState,
  content: Content,
): { share: number; margin: number } {
  const report = publicPoll(state, content);
  return {
    share: round1(report.standings[0].share),
    margin: round1(report.margin),
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
    !isAvailable(state, action) ||
    (action.targeting === "group" &&
      !content.groups.some((g) => g.id === targetId)) ||
    (action.targeting === "rival" &&
      !content.rivals.some((r) => r.id === targetId))
  ) {
    return null;
  }
  const projected = applyEffects(
    state,
    content,
    action.effects,
    action.targeting === "group" ? targetId : undefined,
    action.targeting === "rival" ? targetId : undefined,
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
  const candidates = [
    { id: "client", name: content.contract.candidateName, votes: 0, share: 0 },
    ...content.rivals.map((r) => ({
      id: r.id,
      name: r.name,
      votes: 0,
      share: 0,
    })),
  ];

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
    const raw = candidates.map(
      (c) =>
        (votesCast *
          (c.id === "client"
            ? state.support[group.id]
            : state.rivalSupport[c.id][group.id])) /
        100,
    );
    const allocated = raw.map(Math.floor);
    const order = raw
      .map((n, i) => ({ i, fraction: n - allocated[i] }))
      .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
    const remaining = votesCast - allocated.reduce((a, b) => a + b, 0);
    for (let i = 0; i < remaining; i++) allocated[order[i % order.length].i]++;
    const candidateVotes = Object.fromEntries(
      candidates.map((c, i) => {
        c.votes += allocated[i];
        return [c.id, allocated[i]];
      }),
    );
    const votesForUs = candidateVotes.client;

    totalVotes += votesCast;
    ourVotes += votesForUs;
    groups.push({
      groupId: group.id,
      name: group.name,
      support: round1(state.support[group.id]),
      turnoutPct: round1(turnoutPct),
      votesCast,
      votesForUs,
      candidateVotes,
    });
  }

  const voteShare =
    totalVotes === 0 ? 0 : round1((ourVotes / totalVotes) * 100);
  for (const candidate of candidates)
    candidate.share =
      totalVotes === 0 ? 0 : round1((candidate.votes / totalVotes) * 100);
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const winnerId = sorted[0].votes > sorted[1].votes ? sorted[0].id : null;
  const objectives: ObjectiveResult[] = content.contract.objectives.map(
    (objective) => {
      const actual =
        objective.stat === "win"
          ? Number(winnerId === "client")
          : objective.stat === "voteShare"
            ? totalVotes === 0
              ? 0
              : (ourVotes / totalVotes) * 100
            : round1(state.morale);
      return {
        id: objective.id,
        label: objective.label,
        target: objective.target,
        actual: round1(actual),
        met:
          objective.comparison === "above"
            ? actual > objective.target
            : actual >= objective.target,
        optional: objective.optional,
        reward: objective.reward,
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
    sacked: objectives.some((o) => !o.optional && !o.met),
    candidates,
    winnerId,
  };
}

/** Seed + move list fully reconstructs a campaign. This is the save format. */
export function replay(
  content: Content,
  seed: number,
  moves: PlayerMove[],
  start?: StartingStats,
): GameState {
  let state = createGame(content, seed, start);
  for (const move of moves) state = applyMove(state, content, move).state;
  return state;
}
