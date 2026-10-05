import type { CareerRequirement, Content } from "../schema/content";
import {
  createGame,
  defaultStart,
  endDay,
  playTurn,
  runElection,
} from "./engine";
import { nextRandom } from "./rng";
import type {
  ElectionResult,
  GameState,
  MoveResult,
  PlayerMove,
  StartingStats,
} from "./types";

interface CareerStats extends StartingStats {
  /** How widely known you are; opens bigger contracts. */
  recognition: number;
}

export interface CompanyProfile {
  name: string;
  logo: string | null;
  values: string[];
}

interface OperatingStats {
  credibility: number;
  ruthlessness: number;
  recognition: number;
  cash: number;
}

export interface CompanyState {
  profile: CompanyProfile;
  cash: number;
  credibility: number;
  ruthlessness: number;
  recognition: number;
  staff: number;
}

/** The save format: a career is rebuilt by replaying these in order. */
export type CareerEntry =
  | { kind: "accept"; scenarioId: string }
  | { kind: "move"; campaignId: number; move: PlayerMove }
  | { kind: "tick" }
  | { kind: "incorporate"; profile: CompanyProfile }
  | { kind: "hire" };

interface ActiveCampaign {
  id: number;
  scenarioId: string;
  /** Operator stats inside are stale; read them through `campaignView`. */
  state: GameState;
}

export interface CampaignOutcome {
  campaignId: number;
  scenarioId: string;
  start: StartingStats;
  election: ElectionResult;
  feeEarned: number;
  recognitionDelta: number;
  /** The career day whose close decided the election. */
  decidedOnDay: number;
}

export interface CareerState {
  careerSeed: number;
  day: number;
  stats: CareerStats;
  company: CompanyState | null;
  active: ActiveCampaign[];
  history: CampaignOutcome[];
  accepted: number;
}

export interface Offer {
  scenarioId: string;
  unmet: CareerRequirement[];
  running: boolean;
}

type Scenarios = Record<string, Content>;

const MAX_MARGIN_BONUS = 10;
const TIER_ORDER = ["parliamentary", "council"] as const;
export const INCORPORATION_FEE = 10_000;
export const HIRE_FEE = 5_000;
export const DAILY_WAGE = 500;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function normalizeProfile(profile: CompanyProfile): CompanyProfile {
  const name = profile.name.trim();
  if (!name) throw new Error("Company name is required");
  return {
    name,
    logo: profile.logo?.trim() ? profile.logo.trim() : null,
    values: profile.values.map((v) => v.trim()).filter(Boolean),
  };
}

function isCanonicalProfile(profile: CompanyProfile): boolean {
  const normalized = normalizeProfile(profile);
  return (
    normalized.name === profile.name &&
    normalized.logo === profile.logo &&
    normalized.values.length === profile.values.length &&
    normalized.values.every((value, i) => value === profile.values[i])
  );
}

function scenarioOrThrow(scenarios: Scenarios, id: string): Content {
  const content = scenarios[id];
  if (!content) throw new Error(`Unknown scenario: ${id}`);
  return content;
}

export function startCareer(
  scenarios: Scenarios,
  firstScenarioId: string,
  careerSeed: number,
): CareerState {
  return {
    careerSeed,
    day: 1,
    stats: {
      ...defaultStart(scenarioOrThrow(scenarios, firstScenarioId)),
      recognition: 0,
    },
    company: null,
    active: [],
    history: [],
    accepted: 0,
  };
}

function operatingStats(career: CareerState): OperatingStats {
  const source = career.company ?? career.stats;
  return {
    credibility: source.credibility,
    ruthlessness: source.ruthlessness,
    recognition: source.recognition,
    cash: career.company ? career.company.cash : career.stats.personalFunds,
  };
}

function withOperatingStats(
  career: CareerState,
  stats: OperatingStats,
): CareerState {
  if (career.company) {
    return { ...career, company: { ...career.company, ...stats } };
  }
  const { cash, ...rest } = stats;
  return { ...career, stats: { ...rest, personalFunds: cash } };
}

/** The shared operator pool, as a campaign sees it. */
function startingStats(career: CareerState): StartingStats {
  const { credibility, ruthlessness, cash } = operatingStats(career);
  return { credibility, ruthlessness, personalFunds: cash };
}

function incorporationStatus(career: CareerState): "pre" | "post" | "invalid" {
  if (!career.company) return "pre";
  const { profile, cash, credibility, ruthlessness, recognition, staff } =
    career.company;
  const validProfile = (() => {
    try {
      return isCanonicalProfile(profile);
    } catch {
      return false;
    }
  })();
  const valid =
    validProfile &&
    [cash, credibility, ruthlessness, recognition, staff].every(
      Number.isFinite,
    );
  return valid ? "post" : "invalid";
}

export function canIncorporate(career: CareerState): boolean {
  return (
    incorporationStatus(career) === "pre" &&
    career.stats.personalFunds >= INCORPORATION_FEE
  );
}

export function incorporateCareer(
  career: CareerState,
  profile: CompanyProfile,
): CareerState {
  const status = incorporationStatus(career);
  if (status === "post") throw new Error("Already incorporated");
  if (status === "invalid")
    throw new Error("Corrupted career incorporation state");
  if (career.stats.personalFunds < INCORPORATION_FEE)
    throw new Error("Not enough personal funds");
  return {
    ...career,
    stats: {
      credibility: 0,
      ruthlessness: 0,
      personalFunds: 0,
      recognition: 0,
    },
    company: {
      profile: normalizeProfile(profile),
      cash: career.stats.personalFunds - INCORPORATION_FEE,
      credibility: career.stats.credibility,
      ruthlessness: career.stats.ruthlessness,
      recognition: career.stats.recognition,
      staff: 0,
    },
  };
}

export function canHire(career: CareerState): boolean {
  return career.company !== null && career.company.cash >= HIRE_FEE;
}

function hireStaff(career: CareerState): CareerState {
  if (!career.company) throw new Error("Incorporate before hiring staff");
  if (career.company.cash < HIRE_FEE)
    throw new Error("Not enough company cash");
  return {
    ...career,
    company: {
      ...career.company,
      cash: career.company.cash - HIRE_FEE,
      staff: career.company.staff + 1,
    },
  };
}

/** You run one account yourself; each hire runs one more. */
export function accountCapacity(career: CareerState): number {
  return 1 + (career.company?.staff ?? 0);
}

/** A career the single-campaign game can show: no company and at most one account. */
export function isSoloCareer(career: CareerState): boolean {
  return career.company === null && career.active.length <= 1;
}

/** Derived rather than stored, so a career replays from its seed alone. */
export function nextCampaignSeed(career: CareerState): number {
  const roll = nextRandom(career.careerSeed + career.accepted * 7919);
  return Math.floor(roll.value * 2 ** 31);
}

function unmetCareerRequirements(
  stats: OperatingStats,
  requires: CareerRequirement[],
): CareerRequirement[] {
  return requires.filter(
    (r) =>
      (r.min !== undefined && stats[r.stat] < r.min) ||
      (r.max !== undefined && stats[r.stat] > r.max),
  );
}

/** Sacked operators get the fallback; everyone else sees every contract, locked ones as goals. */
export function careerOffers(
  career: CareerState,
  scenarios: Scenarios,
): Offer[] {
  const running = new Set(career.active.map((c) => c.scenarioId));
  const last = career.history.at(-1);
  if (last?.election.sacked) {
    const fallback = scenarioOrThrow(scenarios, last.scenarioId).contract
      .fallback;
    if (fallback === undefined) return [];
    return [
      { scenarioId: fallback, unmet: [], running: running.has(fallback) },
    ];
  }

  const offers = Object.values(scenarios)
    .map((content) => ({
      scenarioId: content.contract.id,
      tier: TIER_ORDER.indexOf(content.contract.tier),
      unmet: unmetCareerRequirements(
        operatingStats(career),
        content.contract.requires,
      ),
      running: running.has(content.contract.id),
    }))
    .sort((a, b) => a.tier - b.tier)
    .map(({ scenarioId, unmet, running }) => ({ scenarioId, unmet, running }));

  if (last && !offers.some((o) => o.unmet.length === 0)) {
    const fallback = scenarioOrThrow(scenarios, last.scenarioId).contract
      .fallback;
    if (fallback === undefined) return offers;
    return offers.map((o) =>
      o.scenarioId === fallback ? { ...o, unmet: [] } : o,
    );
  }
  return offers;
}

export function canAccept(
  career: CareerState,
  scenarios: Scenarios,
  scenarioId: string,
): boolean {
  const offer = careerOffers(career, scenarios).find(
    (o) => o.scenarioId === scenarioId,
  );
  return (
    offer !== undefined &&
    offer.unmet.length === 0 &&
    !offer.running &&
    career.active.length < accountCapacity(career)
  );
}

/** Sacked from a bottom-rung contract with nothing left running: nobody is calling. */
export function isCareerOver(
  career: CareerState,
  scenarios: Scenarios,
): boolean {
  const last = career.history.at(-1);
  return (
    career.active.length === 0 &&
    last !== undefined &&
    last.election.sacked &&
    scenarioOrThrow(scenarios, last.scenarioId).contract.fallback === undefined
  );
}

/** Where this spin doctor ends up; fixed by the career seed so a reload tells the same story. */
export function careerEpilogue(
  career: CareerState,
  epilogues: string[],
): string {
  const roll = nextRandom(career.careerSeed + career.history.length * 104_729);
  return epilogues[Math.floor(roll.value * epilogues.length)];
}

function appealScore(stats: OperatingStats, content: Content): number {
  return content.contract.appeal.reduce(
    (score, { stat, weight }) => score + stats[stat] * weight,
    0,
  );
}

/**
 * The client a solo operator is handed next, without choosing: the first contract on a
 * fresh career, otherwise the highest-tier open offer, preferring a new seat over a repeat.
 * Within a tier, the client whose appeal best matches the operator's reputation calls first.
 */
export function nextAssignment(
  career: CareerState,
  scenarios: Scenarios,
  firstScenarioId: string,
): string | null {
  if (career.active.length >= accountCapacity(career)) return null;
  const open = careerOffers(career, scenarios).filter(
    (o) => o.unmet.length === 0 && !o.running,
  );
  const last = career.history.at(-1);
  if (!last) {
    return open.some((o) => o.scenarioId === firstScenarioId)
      ? firstScenarioId
      : null;
  }
  const fresh = open.filter((o) => o.scenarioId !== last.scenarioId);
  const pool = fresh.length > 0 ? fresh : open;
  if (pool.length === 0) return null;
  const tierOf = (id: string) =>
    TIER_ORDER.indexOf(scenarioOrThrow(scenarios, id).contract.tier);
  const bestTier = tierOf(pool[0].scenarioId);
  const stats = operatingStats(career);
  const ranked = pool
    .filter((o) => tierOf(o.scenarioId) === bestTier)
    .map((o) => ({
      scenarioId: o.scenarioId,
      score: appealScore(stats, scenarioOrThrow(scenarios, o.scenarioId)),
    }));
  return ranked.reduce((best, o) => (o.score > best.score ? o : best))
    .scenarioId;
}

function acceptOffer(
  career: CareerState,
  scenarios: Scenarios,
  scenarioId: string,
): CareerState {
  if (!canAccept(career, scenarios, scenarioId))
    throw new Error(`Cannot take on ${scenarioId}`);
  const content = scenarioOrThrow(scenarios, scenarioId);
  const state = createGame(
    content,
    nextCampaignSeed(career),
    startingStats(career),
  );
  return {
    ...career,
    accepted: career.accepted + 1,
    active: [...career.active, { id: career.accepted, scenarioId, state }],
  };
}

function withPool(state: GameState, career: CareerState): GameState {
  const pool = startingStats(career);
  return { ...state, ...pool };
}

/** A campaign's state carrying the live operator pool, for display and forecasts. */
export function campaignView(
  career: CareerState,
  campaignId: number,
): GameState {
  const campaign = career.active.find((c) => c.id === campaignId);
  if (!campaign) throw new Error(`No active campaign ${campaignId}`);
  return withPool(campaign.state, career);
}

/** Plays one move on one account, feeding its operator effects back into the shared pool. */
export function playCampaignMove(
  career: CareerState,
  scenarios: Scenarios,
  campaignId: number,
  move: PlayerMove,
): { career: CareerState; result: MoveResult } {
  const campaign = career.active.find((c) => c.id === campaignId);
  if (!campaign) throw new Error(`No active campaign ${campaignId}`);
  const content = scenarioOrThrow(scenarios, campaign.scenarioId);
  const result = playTurn(withPool(campaign.state, career), content, move);
  const current = operatingStats(career);
  const pooled = withOperatingStats(career, {
    ...current,
    credibility: result.state.credibility,
    ruthlessness: result.state.ruthlessness,
    cash: result.state.personalFunds,
  });
  return {
    career: {
      ...pooled,
      active: pooled.active.map((c) =>
        c.id === campaignId ? { ...c, state: result.state } : c,
      ),
    },
    result,
  };
}

function resolveCampaign(
  career: CareerState,
  scenarios: Scenarios,
  campaign: ActiveCampaign,
): CareerState {
  const content = scenarioOrThrow(scenarios, campaign.scenarioId);
  const election = runElection(campaign.state, content);
  const { contract } = content;
  const current = operatingStats(career);

  const shareTarget = Math.max(
    0,
    ...contract.objectives
      .filter((o) => o.stat === "voteShare")
      .map((o) => o.target),
  );
  const marginBonus = clamp(
    Math.round(election.voteShare - shareTarget),
    0,
    MAX_MARGIN_BONUS,
  );
  const rawDelta = election.sacked
    ? contract.recognition.sacked
    : contract.recognition.kept + marginBonus;
  const feeEarned = election.sacked ? 0 : contract.fee;
  const recognition = clamp(current.recognition + rawDelta, 0, 100);

  return {
    ...withOperatingStats(career, {
      ...current,
      recognition,
      cash: current.cash + feeEarned,
    }),
    active: career.active.filter((c) => c.id !== campaign.id),
    history: [
      ...career.history,
      {
        campaignId: campaign.id,
        scenarioId: campaign.scenarioId,
        start: campaign.state.start,
        election,
        feeEarned,
        recognitionDelta: recognition - current.recognition,
        decidedOnDay: career.day,
      },
    ],
  };
}

/** Ends the day everywhere: idle accounts lose morale, staff are paid, finished races are called. */
function tick(career: CareerState, scenarios: Scenarios): CareerState {
  const advanced = career.active.map((c) => ({
    ...c,
    state: endDay(c.state, scenarioOrThrow(scenarios, c.scenarioId)),
  }));
  let next: CareerState = { ...career, active: advanced };
  if (next.company && next.company.staff > 0) {
    const wages = next.company.staff * DAILY_WAGE;
    next = {
      ...next,
      company: {
        ...next.company,
        cash: Math.max(0, next.company.cash - wages),
      },
    };
  }
  for (const campaign of advanced) {
    if (campaign.state.finished)
      next = resolveCampaign(next, scenarios, campaign);
  }
  return { ...next, day: career.day + 1 };
}

export function applyCareerEntry(
  career: CareerState,
  scenarios: Scenarios,
  entry: CareerEntry,
): CareerState {
  switch (entry.kind) {
    case "accept":
      return acceptOffer(career, scenarios, entry.scenarioId);
    case "move":
      return playCampaignMove(career, scenarios, entry.campaignId, entry.move)
        .career;
    case "tick":
      return tick(career, scenarios);
    case "incorporate":
      return incorporateCareer(career, entry.profile);
    case "hire":
      return hireStaff(career);
  }
}

export function replayCareer(
  scenarios: Scenarios,
  firstScenarioId: string,
  careerSeed: number,
  log: CareerEntry[],
): CareerState {
  return log.reduce(
    (career, entry) => applyCareerEntry(career, scenarios, entry),
    startCareer(scenarios, firstScenarioId, careerSeed),
  );
}
