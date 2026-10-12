import { describe, expect, it } from "vitest";
import { scenarios } from "../content";
import {
  createGame,
  endDay,
  forecastAction,
  playTurn,
  runElection,
} from "./engine";
import type { GameState } from "./types";

const content = scenarios["parliamentary-harwell"];
function conserved(state: GameState) {
  for (const group of content.groups) {
    expect(
      state.support[group.id] +
        content.rivals.reduce(
          (sum, r) => sum + state.rivalSupport[r.id][group.id],
          0,
        ),
    ).toBeCloseTo(100, 8);
    for (const rival of content.rivals) {
      expect(state.rivalSupport[rival.id][group.id]).toBeGreaterThanOrEqual(0);
      if (rival.novelty)
        expect(state.rivalSupport[rival.id][group.id]).toBeLessThanOrEqual(
          rival.support[group.id],
        );
    }
  }
}

describe("candidate field", () => {
  it("describes Count Binface's established novelty persona", () => {
    const binface = content.rivals.find((rival) => rival.id === "binface")!;
    expect(binface.name).toBe("Count Binface");
    for (const detail of ["Recyclons", "Sigma IX", "General Waste", "Dustbin"])
      expect(binface.blurb).toContain(detail);
  });
  it("has parliamentary novelty opponents but never novelty contracts", () => {
    expect(content.rivals.filter((r) => r.novelty).map((r) => r.id)).toEqual([
      "loony",
      "binface",
    ]);
    for (const scenario of Object.values(scenarios)) {
      if (scenario.contract.tier === "council")
        expect(scenario.rivals.some((r) => r.novelty)).toBe(false);
    }
    expect(scenarios.binface).toBeUndefined();
    expect(scenarios.loony).toBeUndefined();
  });
  it("caps novelty attacks and never replenishes novelty support from backlash", () => {
    const start = createGame(content, 42);
    const attacked = playTurn(start, content, {
      kind: "action",
      actionId: "attackAd",
      target: "binface",
    }).state;
    conserved(attacked);
    for (const group of content.groups) {
      expect(attacked.rivalSupport.binface[group.id]).toBe(0);
      expect(attacked.support[group.id]).toBeLessThanOrEqual(
        start.support[group.id] + 2,
      );
    }
    const second = playTurn(endDay(attacked, content), content, {
      kind: "action",
      actionId: "attackAd",
      target: "binface",
    }).state;
    conserved(second);
  });
  it("conserves exact integer election totals across five candidates", () => {
    const result = runElection(createGame(content, 42), content);
    expect(result.candidates).toHaveLength(5);
    expect(result.candidates.reduce((sum, c) => sum + c.votes, 0)).toBe(
      result.totalVotes,
    );
    for (const group of result.groups)
      expect(
        Object.values(group.candidateVotes).reduce((a, b) => a + b, 0),
      ).toBe(group.votesCast);
  });
  it("keeps optional failures separate from required goals", () => {
    const start = createGame(content, 42);
    const state = {
      ...start,
      support: Object.fromEntries(content.groups.map((g) => [g.id, 50])),
      turnout: Object.fromEntries(content.groups.map((g) => [g.id, 40])),
      rivalSupport: Object.fromEntries(
        content.rivals.map((r, i) => [
          r.id,
          Object.fromEntries(
            content.groups.map((g) => [g.id, i === 0 ? 50 : 0]),
          ),
        ]),
      ),
    };
    const result = runElection(state, {
      ...content,
      groups: content.groups.map((g) => ({ ...g, baseTurnout: 100 })),
    });
    expect(result.winnerId).toBeNull();
    expect(result.objectives.find((o) => o.id === "majority")?.met).toBe(false);
    expect(result.objectives.find((o) => o.id === "win")?.met).toBe(false);
    expect(result.sacked).toBe(true);
    const majority = {
      ...state,
      support: Object.fromEntries(content.groups.map((g) => [g.id, 50.1])),
      rivalSupport: Object.fromEntries(
        content.rivals.map((r, i) => [
          r.id,
          Object.fromEntries(
            content.groups.map((g) => [g.id, i === 0 ? 49.9 : 0]),
          ),
        ]),
      ),
    };
    const won = runElection(majority, {
      ...content,
      groups: content.groups.map((g) => ({ ...g, baseTurnout: 100 })),
    });
    expect(won.winnerId).toBe("client");
    expect(won.objectives.find((o) => o.id === "majority")?.met).toBe(true);
    expect(won.sacked).toBe(false);
  });
  it("redistributes a unanimous candidate's losses without reviving novelty support", () => {
    const start = createGame(content, 42);
    const state = {
      ...start,
      morale: 0,
      support: Object.fromEntries(content.groups.map((g) => [g.id, 100])),
      rivalSupport: Object.fromEntries(
        content.rivals.map((r) => [
          r.id,
          Object.fromEntries(content.groups.map((g) => [g.id, 0])),
        ]),
      ),
    };
    const attacked = playTurn(state, content, {
      kind: "action",
      actionId: "attackAd",
      target: "binface",
    }).state;
    conserved(attacked);
    for (const rival of content.rivals.filter((r) => r.novelty))
      expect(
        Object.values(attacked.rivalSupport[rival.id]).every(
          (share) => share === 0,
        ),
      ).toBe(true);
  });
});

describe("auxiliary polling", () => {
  it("works after the main action without advancing or refiring an event", () => {
    const played = playTurn(createGame(content, 42), content, {
      kind: "action",
      actionId: "doorstep",
      target: "families",
    }).state;
    const polled = playTurn(played, content, {
      kind: "poll",
      actionId: "fullPoll",
    }).state;
    expect(polled.day).toBe(played.day);
    expect(polled.turnTaken).toBe(true);
    expect(polled.support).toEqual(played.support);
    expect(polled.rngState).toBe(played.rngState);
    expect(() =>
      playTurn(polled, content, { kind: "poll", actionId: "quickPoll" }),
    ).toThrow(/already commissioned/);
    const tomorrow = endDay(polled, content);
    expect(tomorrow.pollReport?.standings).toHaveLength(5);
    for (const group of tomorrow.pollReport!.groups) {
      expect(group.standings.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(
        100,
        8,
      );
      expect(
        group.standings.find((c) => c.id === "binface")!.share,
      ).toBeLessThanOrEqual(2);
    }
    const before = structuredClone(tomorrow);
    expect(
      forecastAction(
        tomorrow,
        content,
        content.actions.find((a) => a.id === "attackAd")!,
        "binface",
      ),
    ).not.toBeNull();
    expect(tomorrow).toEqual(before);
    expect(endDay(tomorrow, content).reports[0]).toEqual(tomorrow.pollReport);
  });
});
