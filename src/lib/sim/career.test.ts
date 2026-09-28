import { describe, expect, it } from "vitest";
import { defaultScenarioId, scenarios } from "../content";
import {
  accountCapacity,
  applyCareerEntry,
  campaignView,
  canAccept,
  canHire,
  canIncorporate,
  careerOffers,
  DAILY_WAGE,
  HIRE_FEE,
  incorporateCareer,
  INCORPORATION_FEE,
  nextCampaignSeed,
  replayCareer,
  startCareer,
  type CareerEntry,
  type CareerState,
} from "./career";
import { IDLE_MORALE_PENALTY } from "./engine";
import type { GameState, PlayerMove } from "./types";

const careerSeed = 2024;
const pendle = "council-pendle";

type Picker = (state: GameState) => PlayerMove | { respond: number };

/** Records every entry so tests can check the log replays to the same career. */
function driver(start: CareerState = fresh()) {
  let career = start;
  const log: CareerEntry[] = [];
  const apply = (entry: CareerEntry) => {
    career = applyCareerEntry(career, scenarios, entry);
    log.push(entry);
    return career;
  };
  /** One day's move for an account, answering any story it triggers. */
  const playDay = (campaignId: number, pick: Picker) => {
    let state = campaignView(career, campaignId);
    while (!state.turnTaken) {
      const choice = pick(state);
      const move: PlayerMove =
        "respond" in choice
          ? {
              kind: "respond",
              eventId: state.pendingEventId!,
              responseIndex: choice.respond,
            }
          : choice;
      apply({ kind: "move", campaignId, move });
      state = campaignView(career, campaignId);
    }
  };
  const playOut = (campaignId: number, pick: Picker) => {
    while (career.active.some((c) => c.id === campaignId)) {
      playDay(campaignId, pick);
      apply({ kind: "tick" });
    }
    return career.history.find((h) => h.campaignId === campaignId)!;
  };
  return {
    apply,
    playDay,
    playOut,
    get career() {
      return career;
    },
    log,
  };
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

const doorstep: Picker = (state) =>
  state.pendingEventId
    ? { respond: 1 }
    : {
        kind: "action",
        actionId: "doorstep",
        target: Object.keys(state.support)[0],
      };

const fresh = () => startCareer(scenarios, defaultScenarioId, careerSeed);

const funded = (personalFunds: number) => ({
  ...fresh(),
  stats: { ...fresh().stats, personalFunds },
});

const company = { name: "Night Shift PR", logo: null, values: [] };

describe("career", () => {
  it("starts on day one with the first contract's stats and no accounts", () => {
    const career = fresh();
    const contract = scenarios[defaultScenarioId].contract;
    expect(career.day).toBe(1);
    expect(career.stats).toEqual({
      recognition: 0,
      credibility: contract.startingCredibility,
      ruthlessness: contract.startingRuthlessness,
      personalFunds: contract.personalFunds,
    });
    expect(career.active).toEqual([]);
    expect(career.history).toEqual([]);
    expect(career.company).toBeNull();
  });

  it("starts every scenario below the personal spending thresholds", () => {
    for (const scenario of Object.values(scenarios)) {
      const career = startCareer(scenarios, scenario.contract.id, careerSeed);
      expect(career.stats.credibility).toBe(0);
      expect(career.stats.ruthlessness).toBe(0);
      expect(career.stats.personalFunds).toBe(6000);
      expect(career.stats.personalFunds).toBeLessThan(INCORPORATION_FEE);
      expect(canIncorporate(career)).toBe(false);
    }
  });

  it("runs only one account before incorporating", () => {
    const run = driver();
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    expect(accountCapacity(run.career)).toBe(1);
    expect(canAccept(run.career, scenarios, pendle)).toBe(false);
    expect(() => run.apply({ kind: "accept", scenarioId: pendle })).toThrow(
      /Cannot take on/,
    );
  });

  it("calls the election only when the final day ends", () => {
    const run = driver();
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    const days = scenarios[defaultScenarioId].contract.days;
    for (let day = 1; day < days; day++) {
      run.playDay(0, winAshcombe);
      run.apply({ kind: "tick" });
    }
    run.playDay(0, winAshcombe);
    expect(run.career.history).toEqual([]);
    expect(run.career.active).toHaveLength(1);

    run.apply({ kind: "tick" });
    expect(run.career.active).toEqual([]);
    expect(run.career.history[0].decidedOnDay).toBe(days);
    expect(run.career.day).toBe(days + 1);
  });

  it("pays the fee and earns recognition when you keep the account", () => {
    const run = driver();
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    const outcome = run.playOut(0, winAshcombe);
    const contract = scenarios[defaultScenarioId].contract;

    expect(outcome.election.sacked).toBe(false);
    expect(outcome.feeEarned).toBe(contract.fee);
    expect(outcome.recognitionDelta).toBeGreaterThanOrEqual(
      contract.recognition.kept,
    );
    expect(run.career.stats.recognition).toBe(outcome.recognitionDelta);
  });

  it("costs the candidate morale for a day left idle", () => {
    const run = driver();
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    const before = campaignView(run.career, 0);
    run.apply({ kind: "tick" });
    const after = campaignView(run.career, 0);
    expect(after.day).toBe(2);
    expect(after.morale).toBe(before.morale - IDLE_MORALE_PENALTY);
  });

  it("opens the parliamentary seat once recognition is earned", () => {
    const locked = careerOffers(fresh(), scenarios).find(
      (o) => o.scenarioId === "parliamentary-harwell",
    )!;
    expect(locked.unmet.map((r) => r.stat)).toContain("recognition");

    const run = driver();
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    run.playOut(0, winAshcombe);
    const offers = careerOffers(run.career, scenarios);
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
    const run = driver();
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    const outcome = run.playOut(0, loseAshcombe);
    expect(outcome.election.sacked).toBe(true);
    expect(outcome.feeEarned).toBe(0);
    expect(run.career.stats.recognition).toBe(0);
    expect(careerOffers(run.career, scenarios)).toEqual([
      {
        scenarioId: scenarios[defaultScenarioId].contract.fallback,
        unmet: [],
        running: false,
      },
    ]);
  });

  it("derives campaign seeds deterministically from the career", () => {
    const run = driver();
    expect(nextCampaignSeed(run.career)).toBe(nextCampaignSeed(fresh()));
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    expect(nextCampaignSeed(run.career)).not.toBe(nextCampaignSeed(fresh()));
  });

  it("rebuilds the same career from its log", () => {
    const run = driver();
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    run.playOut(0, loseAshcombe);
    run.apply({ kind: "accept", scenarioId: pendle });
    run.playDay(1, winAshcombe);
    run.apply({ kind: "tick" });
    expect(
      replayCareer(scenarios, defaultScenarioId, careerSeed, run.log),
    ).toEqual(run.career);
  });
});

describe("company", () => {
  it("can incorporate once personal funds cover the fee", () => {
    expect(canIncorporate(funded(INCORPORATION_FEE - 1))).toBe(false);
    expect(canIncorporate(funded(INCORPORATION_FEE))).toBe(true);
  });

  it("transfers personal stats into the company on incorporation", () => {
    const career = {
      ...fresh(),
      stats: {
        recognition: 12,
        credibility: 65,
        ruthlessness: 34,
        personalFunds: INCORPORATION_FEE + 5000,
      },
    };
    const incorporated = incorporateCareer(career, {
      name: "Heliotrope Strategies",
      logo: null,
      values: ["Transparency", "Results"],
    });
    expect(incorporated.stats).toEqual({
      recognition: 0,
      credibility: 0,
      ruthlessness: 0,
      personalFunds: 0,
    });
    expect(incorporated.company).toEqual({
      profile: {
        name: "Heliotrope Strategies",
        logo: null,
        values: ["Transparency", "Results"],
      },
      recognition: 12,
      credibility: 65,
      ruthlessness: 34,
      cash: 5000,
      staff: 0,
    });
  });

  it("rejects incorporation with a blank company name", () => {
    expect(() =>
      incorporateCareer(funded(INCORPORATION_FEE + 1000), {
        name: "   ",
        logo: null,
        values: ["Anything"],
      }),
    ).toThrow(/Company name is required/);
  });

  it("rejects re-incorporation after incorporation", () => {
    const incorporated = incorporateCareer(
      funded(INCORPORATION_FEE + 1),
      company,
    );
    expect(() => incorporateCareer(incorporated, company)).toThrow(
      /Already incorporated/,
    );
  });

  it("throws a corruption error for malformed company data", () => {
    const corrupt = {
      ...fresh(),
      company: {
        profile: { name: "   ", logo: null, values: [] },
        cash: 9999,
        credibility: 50,
        ruthlessness: 50,
        recognition: 10,
        staff: 0,
      },
    };
    expect(() => incorporateCareer(corrupt, company)).toThrow(
      /Corrupted career incorporation state/,
    );
  });

  it("routes fees to the company after incorporation", () => {
    const run = driver(funded(INCORPORATION_FEE + 2000));
    run.apply({ kind: "incorporate", profile: company });
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    const outcome = run.playOut(0, winAshcombe);
    const contract = scenarios[defaultScenarioId].contract;
    expect(run.career.stats.personalFunds).toBe(0);
    expect(run.career.company?.cash).toBeGreaterThanOrEqual(
      2000 + contract.fee,
    );
    expect(outcome.feeEarned).toBe(contract.fee);
  });

  it("needs a company and the fee to hire", () => {
    expect(canHire(funded(HIRE_FEE))).toBe(false);
    expect(() =>
      applyCareerEntry(fresh(), scenarios, { kind: "hire" }),
    ).toThrow(/Incorporate/);
    const broke = driver(funded(INCORPORATION_FEE + HIRE_FEE - 1));
    broke.apply({ kind: "incorporate", profile: company });
    expect(canHire(broke.career)).toBe(false);
  });

  it("adds an account per hire and pays wages each day", () => {
    const run = driver(funded(INCORPORATION_FEE + HIRE_FEE + 1000));
    run.apply({ kind: "incorporate", profile: company });
    run.apply({ kind: "hire" });
    expect(run.career.company?.cash).toBe(1000);
    expect(accountCapacity(run.career)).toBe(2);

    run.apply({ kind: "tick" });
    expect(run.career.company?.cash).toBe(1000 - DAILY_WAGE);
    run.apply({ kind: "tick" });
    run.apply({ kind: "tick" });
    expect(run.career.company?.cash).toBe(0);
  });

  it("runs concurrent accounts from one shared operator pool", () => {
    const run = driver(funded(INCORPORATION_FEE + HIRE_FEE + 5000));
    run.apply({ kind: "incorporate", profile: company });
    run.apply({ kind: "hire" });
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    run.apply({ kind: "accept", scenarioId: pendle });
    expect(run.career.active.map((c) => c.id)).toEqual([0, 1]);

    const before = run.career.company!.credibility;
    run.playDay(0, doorstep);
    const pool = run.career.company!.credibility;
    expect(pool).toBeGreaterThan(before);
    expect(campaignView(run.career, 1).credibility).toBe(pool);
    expect(campaignView(run.career, 1).turnTaken).toBe(false);
  });

  it("will not run the same seat twice at once", () => {
    const run = driver(funded(INCORPORATION_FEE + HIRE_FEE));
    run.apply({ kind: "incorporate", profile: company });
    run.apply({ kind: "hire" });
    run.apply({ kind: "accept", scenarioId: defaultScenarioId });
    const offer = careerOffers(run.career, scenarios).find(
      (o) => o.scenarioId === defaultScenarioId,
    )!;
    expect(offer.running).toBe(true);
    expect(canAccept(run.career, scenarios, defaultScenarioId)).toBe(false);
    expect(canAccept(run.career, scenarios, pendle)).toBe(true);
  });
});
