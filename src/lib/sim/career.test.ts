import { describe, expect, it } from "vitest";
import { defaultScenarioId, scenarios } from "../content";
import {
  careerOffers,
  completeCampaign,
  nextCampaignSeed,
  replayCareer,
  startCareer,
  startingStats,
  type CampaignRecord,
  type CareerState,
} from "./career";
import { applyMove, createGame } from "./engine";
import type { PlayerMove } from "./types";

const careerSeed = 2024;

type Picker = (
  state: ReturnType<typeof createGame>,
) => PlayerMove | { respond: number };

function playOut(
  career: CareerState,
  scenarioId: string,
  pick: Picker,
): CampaignRecord {
  const content = scenarios[scenarioId];
  const seed = nextCampaignSeed(career);
  let state = createGame(content, seed, startingStats(career));
  while (!state.finished) {
    const choice = pick(state);
    const move: PlayerMove =
      "respond" in choice
        ? {
            kind: "respond",
            eventId: state.pendingEventId!,
            responseIndex: choice.respond,
          }
        : choice;
    state = applyMove(state, content, move).state;
  }
  return { scenarioId, seed, moves: state.history };
}

/** Backs the blockade for the absurd 100% result and keeps the candidate rested. */
const winAshcombe: Picker = (state) =>
  state.pendingEventId
    ? { respond: 0 }
    : state.morale < 40
      ? { kind: "action", actionId: "debatePrep" }
      : {
          kind: "action",
          actionId: "doorstep",
          target: Object.keys(state.support)[0],
        };

/** Attack ads until the candidate breaks. */
const loseAshcombe: Picker = (state) =>
  state.pendingEventId
    ? { respond: 1 }
    : state.money >= 6000
      ? { kind: "action", actionId: "attackAd", target: "retirees" }
      : { kind: "action", actionId: "doorstep", target: "retirees" };

const fresh = () => startCareer(scenarios, defaultScenarioId, careerSeed);

describe("career", () => {
  it("starts with the first contract's stats and no recognition", () => {
    const career = fresh();
    const contract = scenarios[defaultScenarioId].contract;
    expect(career.stats).toEqual({
      recognition: 0,
      credibility: contract.startingCredibility,
      ruthlessness: contract.startingRuthlessness,
      personalFunds: contract.personalFunds,
    });
    expect(career.history).toEqual([]);
  });

  it("pays the fee and earns recognition when you keep the account", () => {
    const career = fresh();
    const record = playOut(career, defaultScenarioId, winAshcombe);
    const after = completeCampaign(career, scenarios, record);
    const outcome = after.history[0];
    const contract = scenarios[defaultScenarioId].contract;

    expect(outcome.election.sacked).toBe(false);
    expect(outcome.feeEarned).toBe(contract.fee);
    expect(outcome.recognitionDelta).toBeGreaterThanOrEqual(
      contract.recognition.kept,
    );
    expect(after.stats.recognition).toBe(outcome.recognitionDelta);
  });

  it("carries the campaign's final stats into the next one", () => {
    const career = fresh();
    const record = playOut(career, defaultScenarioId, winAshcombe);
    const after = completeCampaign(career, scenarios, record);
    const next = playOut(after, defaultScenarioId, winAshcombe);
    const later = completeCampaign(after, scenarios, next);
    expect(later.history[1].start).toEqual(startingStats(after));
    expect(startingStats(after).credibility).not.toBe(career.stats.credibility);
  });

  it("opens the parliamentary seat once recognition is earned", () => {
    const career = fresh();
    const locked = careerOffers(career, scenarios).find(
      (o) => o.scenarioId === "parliamentary-harwell",
    )!;
    expect(locked.unmet.map((r) => r.stat)).toContain("recognition");

    const after = completeCampaign(
      career,
      scenarios,
      playOut(career, defaultScenarioId, winAshcombe),
    );
    const offers = careerOffers(after, scenarios);
    expect(offers[0].scenarioId).toBe("parliamentary-harwell");
    expect(offers[0].unmet).toEqual([]);
  });

  it("turns away operators too ruthless for the client", () => {
    const career = fresh();
    const notorious = {
      ...career,
      stats: { ...career.stats, recognition: 50, ruthlessness: 90 },
    };
    const harwell = careerOffers(notorious, scenarios).find(
      (o) => o.scenarioId === "parliamentary-harwell",
    )!;
    expect(harwell.unmet.map((r) => r.stat)).toEqual(["ruthlessness"]);
  });

  it("pays nothing and offers only the fallback after a sacking", () => {
    const career = fresh();
    const after = completeCampaign(
      career,
      scenarios,
      playOut(career, defaultScenarioId, loseAshcombe),
    );
    expect(after.history[0].election.sacked).toBe(true);
    expect(after.history[0].feeEarned).toBe(0);
    expect(after.stats.recognition).toBe(0);
    expect(careerOffers(after, scenarios)).toEqual([
      { scenarioId: scenarios[defaultScenarioId].contract.fallback, unmet: [] },
    ]);
  });

  it("refuses to complete a campaign that has not reached election day", () => {
    const career = fresh();
    expect(() =>
      completeCampaign(career, scenarios, {
        scenarioId: defaultScenarioId,
        seed: 1,
        moves: [],
      }),
    ).toThrow(/not finished/);
  });

  it("derives campaign seeds deterministically from the career", () => {
    const career = fresh();
    expect(nextCampaignSeed(career)).toBe(nextCampaignSeed(fresh()));
    const after = completeCampaign(
      career,
      scenarios,
      playOut(career, defaultScenarioId, winAshcombe),
    );
    expect(nextCampaignSeed(after)).not.toBe(nextCampaignSeed(career));
  });

  it("rebuilds the same career from its records", () => {
    let career = fresh();
    const records: CampaignRecord[] = [];
    for (const pick of [loseAshcombe, winAshcombe]) {
      const scenarioId = careerOffers(career, scenarios).find(
        (o) => o.unmet.length === 0,
      )!.scenarioId;
      const record = playOut(career, scenarioId, pick);
      records.push(record);
      career = completeCampaign(career, scenarios, record);
    }
    expect(
      replayCareer(scenarios, defaultScenarioId, careerSeed, records),
    ).toEqual(career);
  });
});
