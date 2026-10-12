import { describe, expect, it } from "vitest";
import { content, defaultScenarioId, scenarios } from "../content";
import { reminderDays } from "../reminderSchedule";
import { actionSchema, contractSchema, type Content } from "../schema/content";
import {
  applyCareerEntry,
  campaignView,
  canAccept,
  careerOffers,
  isCareerOver,
  nextAssignment,
  replayCareer,
  startCareer,
  type CareerEntry,
} from "./career";
import {
  applyMove,
  createGame,
  forecastAction,
  playTurn,
  runElection,
} from "./engine";
import { nextRandom } from "./rng";
import { specialPreview, visibleSpecialActions } from "./specialActions";

function fixture(failureChance = 0.15, dismissalChance = 0): Content {
  return {
    ...content,
    events: [],
    gaffes: [],
    contract: {
      ...content.contract,
      startingCredibility: 90,
      startingRuthlessness: 90,
      personalFunds: 100000,
    },
    actions: content.actions.map((action) =>
      action.id === "insideTrack"
        ? { ...action, special: { ...action.special!, failureChance } }
        : action.id === "deadCat"
          ? {
              ...action,
              special: {
                ...action.special!,
                failureChance: 1,
                dismissalChance,
              },
            }
          : action,
    ),
  };
}

describe("special-action contract and preview", () => {
  it("rejects missing risk, refunded credibility, penalty-free failure and safe ruthless specials", () => {
    const inside = content.actions.find((a) => a.id === "insideTrack")!;
    expect(
      actionSchema.safeParse({ ...inside, special: undefined }).success,
    ).toBe(false);
    expect(
      actionSchema.safeParse({
        ...inside,
        effects: [{ on: "all", stat: "credibility", delta: 5 }],
      }).success,
    ).toBe(false);
    expect(
      actionSchema.safeParse({
        ...inside,
        special: { ...inside.special, failureCredibilityPct: 0 },
      }).success,
    ).toBe(false);
    const deadCat = content.actions.find((a) => a.id === "deadCat")!;
    expect(
      actionSchema.safeParse({
        ...deadCat,
        special: { ...deadCat.special, dismissalChance: 0 },
      }).success,
    ).toBe(false);
    expect(
      contractSchema.safeParse({
        ...content.contract,
        dismissalRiskMultiplier: 0,
      }).success,
    ).toBe(false);
  });

  it("shows only the next locked action in each track, regardless of budget", () => {
    const state = { ...createGame(content, 42), money: 0 };
    expect(
      visibleSpecialActions(state, content.actions)
        .filter((a) => a.special)
        .map((a) => a.id),
    ).toEqual(["insideTrack", "deadCat", "personalCheque"]);
    const progressing = { ...state, credibility: 80, ruthlessness: 70 };
    expect(
      visibleSpecialActions(progressing, content.actions)
        .filter((a) => a.special)
        .map((a) => a.id),
    ).toEqual([
      "insideTrack",
      "verifiedSecrets",
      "publicEndorsement",
      "deadCat",
      "frameRival",
      "voterFraud",
      "personalCheque",
    ]);
    const relocked = visibleSpecialActions(
      { ...progressing, credibility: 65 },
      content.actions,
    );
    expect(relocked.some((a) => a.id === "insideTrack")).toBe(true);
    expect(relocked.some((a) => a.id === "verifiedSecrets")).toBe(false);
    expect(relocked.some((a) => a.id === "publicEndorsement")).toBe(false);
    expect(relocked.some((a) => a.id === "doorstep")).toBe(true);
  });

  it("computes percentage losses from pre-attempt credibility without mutating state or RNG", () => {
    const state = createGame(fixture(), 42);
    const before = structuredClone(state);
    const action = content.actions.find((a) => a.id === "insideTrack")!;
    expect(specialPreview(state, content, action)).toMatchObject({
      credibilityCost: 2.7,
      failureCredibilityCost: 10.8,
    });
    expect(state).toEqual(before);
    for (const credibility of [0, 0.1, 1, 100]) {
      const preview = specialPreview(
        { ...state, credibility },
        content,
        action,
      )!;
      expect(
        preview.credibilityCost + preview.failureCredibilityCost,
      ).toBeLessThanOrEqual(credibility);
    }
  });

  it("never advertises a risky reward as a guaranteed polling forecast", () => {
    const state = {
      ...createGame(fixture(), 42),
      pollReport: {
        commissionedOnDay: 0,
        availableOnDay: 1,
        margin: 2,
        standings: [],
        groups: [],
      },
    };
    expect(
      forecastAction(
        state,
        fixture(),
        content.actions.find((a) => a.id === "insideTrack")!,
      ),
    ).toBeNull();
    expect(
      forecastAction(
        state,
        fixture(),
        content.actions.find((a) => a.id === "photoOp")!,
      ),
    ).not.toBeNull();
  });

  it("gates both nefarious clients and leaves their dismissal protection incomplete", () => {
    const clean = startCareer(scenarios, defaultScenarioId, 42);
    for (const [id, gate] of [
      ["parliamentary-gravesend", 75],
      ["parliamentary-blackmere", 85],
    ] as const) {
      expect(canAccept(clean, scenarios, id)).toBe(false);
      const ruthless = {
        ...clean,
        stats: { ...clean.stats, ruthlessness: gate },
      };
      expect(canAccept(ruthless, scenarios, id)).toBe(true);
      const action = scenarios[id].actions.find((a) => a.id === "voterFraud")!;
      const preview = specialPreview(
        createGame(scenarios[id], 42),
        scenarios[id],
        action,
      )!;
      expect(preview.dismissalChance).toBeGreaterThan(0);
      expect(preview.dismissalChance).toBeLessThan(
        action.special!.dismissalChance,
      );
      expect(preview.overallDismissalChance).toBe(
        preview.failureChance * preview.dismissalChance,
      );
    }
  });
  it("keeps a one-percent conditional dismissal floor even for extremely tolerant clients", () => {
    const scenario = {
      ...content,
      contract: { ...content.contract, dismissalRiskMultiplier: 0.000001 },
    };
    const preview = specialPreview(
      createGame(scenario, 42),
      scenario,
      content.actions.find((a) => a.id === "deadCat")!,
    )!;
    expect(preview.dismissalChance).toBe(0.01);
  });
  it("does not bypass ruthless-client gates through the fallback-client exception", () => {
    const scenario = fixture(0);
    const custom = {
      ...scenarios,
      [defaultScenarioId]: {
        ...scenario,
        contract: {
          ...scenario.contract,
          startingCredibility: 0,
          startingRuthlessness: 0,
          fallback: "parliamentary-blackmere",
        },
      },
    };
    let career = applyCareerEntry(
      startCareer(custom, defaultScenarioId, 42),
      custom,
      { kind: "accept", scenarioId: defaultScenarioId },
    );
    for (let day = 0; day < scenario.contract.days; day++)
      career = applyCareerEntry(career, custom, { kind: "tick" });
    expect(career.history[0].kind).toBe("election");
    expect(canAccept(career, custom, "parliamentary-blackmere")).toBe(false);
    expect(
      careerOffers(career, custom)[0].unmet.some(
        (r) => r.stat === "ruthlessness",
      ),
    ).toBe(true);
  });
});

describe("seeded special attempts", () => {
  it("spends credibility on success and preserves deterministic replay", () => {
    const scenario = fixture(0);
    const state = createGame(scenario, 42);
    const move = { kind: "action", actionId: "insideTrack" } as const;
    const result = playTurn(state, scenario, move);
    expect(result.specialOutcome).toBe("success");
    expect(result.state.credibility).toBe(87.3);
    expect(result.state.money).toBe(state.money - 1000);
    expect(result.state.pollAccuracy).toBe(1.25);
    expect(result.state.turnTaken).toBe(true);
    expect(playTurn(state, scenario, move)).toEqual(result);
    expect(state.history).toEqual([]);
  });

  it("charges once on failure, applies progressive penalty, and grants no success reward", () => {
    const scenario = fixture(1);
    const state = createGame(scenario, 42);
    const result = playTurn(state, scenario, {
      kind: "action",
      actionId: "insideTrack",
    });
    expect(result.specialOutcome).toBe("failed");
    expect(result.state.credibility).toBeCloseTo(76.5);
    expect(result.state.money).toBe(state.money - 1000);
    expect(result.state.pollAccuracy).toBe(0);
    expect(result.state.support).toEqual(state.support);
    expect(result.state.news.at(-1)?.kind).toBe("special");
    expect(result.state.turnTaken).toBe(true);
    expect(
      result.feedback.find((line) => line.stat === "credibility")?.delta,
    ).toBe(-13.5);
  });

  it("gives detected schemes no reward even when the client keeps the operator", () => {
    const scenario = fixture(1, 0);
    const state = createGame(scenario, 42);
    const result = playTurn(state, scenario, {
      kind: "action",
      actionId: "deadCat",
    });
    expect(result.specialOutcome).toBe("caught");
    expect(result.state.credibility).toBeCloseTo(76.5);
    expect(result.state.ruthlessness).toBe(state.ruthlessness);
    expect(result.state.finished).toBe(false);
    for (const group of scenario.groups)
      expect(result.state.support[group.id]).toBeLessThan(
        state.support[group.id],
      );
  });

  it("resolves dismissal immediately without gaffes, scheduled events, extra days or an election", () => {
    const scenario = {
      ...fixture(1, 1),
      events: content.events.map((e) => ({ ...e, day: 1 })),
    };
    const state = createGame(scenario, 42);
    const result = applyMove(state, scenario, {
      kind: "action",
      actionId: "deadCat",
    });
    expect(result.specialOutcome).toBe("dismissed");
    expect(result.state.finished).toBe(true);
    expect(result.state.day).toBe(1);
    expect(result.state.pendingEventId).toBeNull();
    expect(result.triggeredEventId).toBeNull();
    expect(result.gaffe).toBeNull();
    expect(result.state.news.at(-1)?.headline).toMatch(/thrown under the bus/);
    expect(() => runElection(result.state, scenario)).toThrow(
      /do not have an election/,
    );
    expect(() =>
      playTurn(result.state, scenario, {
        kind: "action",
        actionId: "doorstep",
        target: "commuters",
      }),
    ).toThrow(/over/);
  });

  it("uses real seeded detection and conditional dismissal probabilities", () => {
    const scenario = fixture();
    const action = content.actions.find((a) => a.id === "frameRival")!;
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 500; seed++) {
      const state = createGame(scenario, seed * 7919);
      const detection = nextRandom(state.rngState);
      const expected =
        detection.value >= action.special!.failureChance
          ? "success"
          : nextRandom(detection.state).value < action.special!.dismissalChance
            ? "dismissed"
            : "caught";
      const result = playTurn(state, scenario, {
        kind: "action",
        actionId: action.id,
        target: scenario.rivals[0].id,
      });
      expect(result.specialOutcome).toBe(expected);
      outcomes.add(expected);
    }
    expect(outcomes).toEqual(new Set(["success", "caught", "dismissed"]));
  });

  it("does not mutate state or spend RNG on unavailable or invalid targets", () => {
    const state = createGame(content, 42);
    const before = structuredClone(state);
    expect(() =>
      playTurn(state, content, { kind: "action", actionId: "insideTrack" }),
    ).toThrow(/not unlocked/);
    expect(() =>
      playTurn({ ...state, ruthlessness: 90 }, content, {
        kind: "action",
        actionId: "frameRival",
        target: "missing",
      }),
    ).toThrow(/Unknown rival/);
    expect(state).toEqual(before);
  });

  it("keeps personal funding a certain transaction with its declared costs", () => {
    const scenario = fixture();
    const state = createGame(scenario, 42);
    const result = playTurn(state, scenario, {
      kind: "action",
      actionId: "personalCheque",
    });
    expect(result.specialOutcome).toBe("success");
    expect(result.state.personalFunds).toBe(state.personalFunds - 15000);
    expect(result.state.money).toBe(state.money + 15000);
    expect(result.state.credibility).toBe(state.credibility - 8);
    expect(result.state.rngState).toBe(state.rngState);
  });
});

describe("account-only dismissal integration", () => {
  it("continues even after dismissal from a bottom-rung client without a fallback", () => {
    const scenario = fixture(1, 1);
    const custom = {
      ...scenarios,
      [defaultScenarioId]: {
        ...scenario,
        contract: { ...scenario.contract, fallback: undefined },
      },
    };
    const log: CareerEntry[] = [
      { kind: "accept", scenarioId: defaultScenarioId },
      {
        kind: "move",
        campaignId: 0,
        move: { kind: "action", actionId: "deadCat" },
      },
    ];
    const career = replayCareer(custom, defaultScenarioId, 42, log);
    expect(career.history[0]).toMatchObject({
      kind: "dismissal",
      election: null,
      feeEarned: 0,
      bonusFunds: 0,
      bonusRecognition: 0,
    });
    expect(career.active).toEqual([]);
    expect(isCareerOver(career, custom)).toBe(false);
    expect(careerOffers(career, custom).length).toBeGreaterThan(1);
    expect(nextAssignment(career, custom, defaultScenarioId)).not.toBeNull();
    expect(career.stats.credibility).toBeCloseTo(76.5);
    expect(replayCareer(custom, defaultScenarioId, 42, log)).toEqual(career);
    expect(
      reminderDays(
        career,
        { careerSeed: 42, log, calendarDate: "2026-10-12" },
        custom,
      ),
    ).toEqual([]);
  });

  it("preserves other accounts and company cash while applying the shared credibility hit", () => {
    const scenario = fixture(1, 1);
    const custom = { ...scenarios, [defaultScenarioId]: scenario };
    const log: CareerEntry[] = [
      {
        kind: "incorporate",
        profile: { name: "Discreet Ltd", logo: null, values: [] },
      },
      { kind: "hire" },
      { kind: "accept", scenarioId: defaultScenarioId },
      { kind: "accept", scenarioId: "council-pendle" },
    ];
    const before = replayCareer(custom, defaultScenarioId, 42, log);
    const entry: CareerEntry = {
      kind: "move",
      campaignId: 0,
      move: { kind: "action", actionId: "deadCat" },
    };
    const after = applyCareerEntry(before, custom, entry);
    expect(after.active.map((c) => c.id)).toEqual([1]);
    expect(after.active[0]).toEqual(before.active[1]);
    expect(after.company?.cash).toBe(before.company?.cash);
    expect(campaignView(after, 1).credibility).toBeCloseTo(76.5);
    expect(after.day).toBe(before.day);
    expect(
      replayCareer(custom, defaultScenarioId, 42, [...log, entry]),
    ).toEqual(after);
    const remaining = reminderDays(
      after,
      { careerSeed: 42, log: [...log, entry], calendarDate: "2026-10-12" },
      custom,
    );
    expect(remaining[0]).toEqual({ date: "2026-10-12", kind: "actions" });
    expect(remaining.filter((day) => day.kind === "election")).toHaveLength(1);
  });
});
