import type { CareerRequirement, Content } from "../schema/content";
import { defaultStart, replay, runElection } from "./engine";
import { nextRandom } from "./rng";
import type { ElectionResult, PlayerMove, StartingStats } from "./types";

interface CareerStats extends StartingStats {
  /** How widely known you are; opens bigger contracts. */
  recognition: number;
}

export interface CompanyProfile {
  name: string;
  logo: string | null;
  values: string[];
}

interface OperatingStats extends CareerStats {
  cash: number;
}

export interface CompanyState {
  profile: CompanyProfile;
  cash: number;
  credibility: number;
  ruthlessness: number;
  recognition: number;
}

export interface CampaignRecord {
  scenarioId: string;
  seed: number;
  moves: PlayerMove[];
}

export interface CampaignOutcome {
  record: CampaignRecord;
  start: StartingStats;
  election: ElectionResult;
  feeEarned: number;
  recognitionDelta: number;
}

export interface CareerState {
  careerSeed: number;
  stats: CareerStats;
  company: CompanyState | null;
  history: CampaignOutcome[];
}

export interface Offer {
  scenarioId: string;
  unmet: CareerRequirement[];
}

type Scenarios = Record<string, Content>;

const MAX_MARGIN_BONUS = 10;
const TIER_ORDER = ["parliamentary", "council"] as const;
export const INCORPORATION_FEE = 10_000;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export function startCareer(
  scenarios: Scenarios,
  firstScenarioId: string,
  careerSeed: number,
): CareerState {
  return {
    careerSeed,
    stats: {
      ...defaultStart(scenarioOrThrow(scenarios, firstScenarioId)),
      recognition: 0,
    },
    company: null,
    history: [],
  };
}

function scenarioOrThrow(scenarios: Scenarios, id: string): Content {
  const content = scenarios[id];
  if (!content) throw new Error(`Unknown scenario: ${id}`);
  return content;
}

export function startingStats(career: CareerState): StartingStats {
  const { credibility, ruthlessness, cash } = operatingStats(career);
  const personalFunds = cash;
  return { credibility, ruthlessness, personalFunds };
}

function operatingStats(career: CareerState): OperatingStats {
  if (career.company) {
    return {
      credibility: career.company.credibility,
      ruthlessness: career.company.ruthlessness,
      personalFunds: 0,
      recognition: career.company.recognition,
      cash: career.company.cash,
    };
  }
  return { ...career.stats, cash: career.stats.personalFunds };
}

function incorporationStatus(career: CareerState): "pre" | "post" | "invalid" {
  if (!career.company) return "pre";
  const { profile, cash, credibility, ruthlessness, recognition } =
    career.company;
  const valid =
    profile.name.trim().length > 0 &&
    Number.isFinite(cash) &&
    Number.isFinite(credibility) &&
    Number.isFinite(ruthlessness) &&
    Number.isFinite(recognition);
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
      profile,
      cash: career.stats.personalFunds - INCORPORATION_FEE,
      credibility: career.stats.credibility,
      ruthlessness: career.stats.ruthlessness,
      recognition: career.stats.recognition,
    },
  };
}

/** Derived rather than stored, so a career replays from its seed alone. */
export function nextCampaignSeed(career: CareerState): number {
  const roll = nextRandom(career.careerSeed + career.history.length * 7919);
  return Math.floor(roll.value * 2 ** 31);
}

function unmetCareerRequirements(
  stats: CareerStats,
  requires: CareerRequirement[],
): CareerRequirement[] {
  return requires.filter(
    (r) =>
      (r.min !== undefined && stats[r.stat] < r.min) ||
      (r.max !== undefined && stats[r.stat] > r.max),
  );
}

export function completeCampaign(
  career: CareerState,
  scenarios: Scenarios,
  record: CampaignRecord,
): CareerState {
  const content = scenarioOrThrow(scenarios, record.scenarioId);
  const start = startingStats(career);
  const state = replay(content, record.seed, record.moves, start);
  if (!state.finished) throw new Error("Campaign is not finished");
  const election = runElection(state, content);
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
  const recognitionDelta = election.sacked
    ? contract.recognition.sacked
    : contract.recognition.kept + marginBonus;
  const feeEarned = election.sacked ? 0 : contract.fee;
  const recognition = clamp(current.recognition + recognitionDelta, 0, 100);

  const updated = {
    recognition,
    credibility: state.credibility,
    ruthlessness: state.ruthlessness,
    cash: state.personalFunds + feeEarned,
  };

  return {
    ...career,
    stats: career.company
      ? career.stats
      : {
          recognition: updated.recognition,
          credibility: updated.credibility,
          ruthlessness: updated.ruthlessness,
          personalFunds: updated.cash,
        },
    company: career.company
      ? {
          ...career.company,
          recognition: updated.recognition,
          credibility: updated.credibility,
          ruthlessness: updated.ruthlessness,
          cash: updated.cash,
        }
      : null,
    history: [
      ...career.history,
      {
        record,
        start,
        election,
        feeEarned,
        recognitionDelta: recognition - current.recognition,
      },
    ],
  };
}

/** Sacked operators get the fallback; everyone else sees every contract, locked ones as goals. */
export function careerOffers(
  career: CareerState,
  scenarios: Scenarios,
): Offer[] {
  const last = career.history.at(-1);
  if (last?.election.sacked) {
    const fallback = scenarioOrThrow(scenarios, last.record.scenarioId).contract
      .fallback;
    return [{ scenarioId: fallback, unmet: [] }];
  }

  const offers = Object.values(scenarios)
    .map((content) => ({
      scenarioId: content.contract.id,
      tier: TIER_ORDER.indexOf(content.contract.tier),
      unmet: unmetCareerRequirements(
        operatingStats(career),
        content.contract.requires,
      ),
    }))
    .sort((a, b) => a.tier - b.tier)
    .map(({ scenarioId, unmet }) => ({ scenarioId, unmet }));

  if (last && !offers.some((o) => o.unmet.length === 0)) {
    const fallback = scenarioOrThrow(scenarios, last.record.scenarioId).contract
      .fallback;
    return offers.map((o) =>
      o.scenarioId === fallback ? { ...o, unmet: [] } : o,
    );
  }
  return offers;
}

export function replayCareer(
  scenarios: Scenarios,
  firstScenarioId: string,
  careerSeed: number,
  records: CampaignRecord[],
): CareerState {
  let career = startCareer(scenarios, firstScenarioId, careerSeed);
  for (const record of records)
    career = completeCampaign(career, scenarios, record);
  return career;
}
