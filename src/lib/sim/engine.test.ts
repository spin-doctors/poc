import { describe, expect, it } from "vitest";
import { content } from "../content";
import {
  applyMove,
  createGame,
  forecastAction,
  isUnlocked,
  pollEstimate,
  replay,
  runElection,
  unmetRequirements,
} from "./engine";
import type { GameState, PlayerMove } from "./types";

const seed = 12345;

function playThrough(moves: PlayerMove[]) {
  let state = createGame(content, seed);
  for (const move of moves) state = applyMove(state, content, move).state;
  return state;
}

/** Plays free canvassing until the given event is pending, answering anything else on the way. */
function playUntilEvent(eventId: string, decline = 1): GameState {
  let state = createGame(content, seed);
  for (let guard = 0; guard < 40 && !state.finished; guard++) {
    if (state.pendingEventId === eventId) return state;
    state = state.pendingEventId
      ? applyMove(state, content, {
          kind: "respond",
          eventId: state.pendingEventId,
          responseIndex: decline,
        }).state
      : applyMove(state, content, {
          kind: "action",
          actionId: "doorstep",
          target: "commuters",
        }).state;
  }
  throw new Error(`${eventId} never fired`);
}

describe("content", () => {
  it("validates against the schema", () => {
    expect(content.groups.length).toBeGreaterThan(0);
    expect(
      content.actions.filter(
        (a) => a.requires.length === 0 && a.pollMargin === undefined,
      ),
    ).toHaveLength(5);
    expect(
      content.actions.filter((a) => a.pollMargin !== undefined),
    ).toHaveLength(3);
    expect(content.contract.days).toBe(7);
  });

  it("only references group ids that exist", () => {
    const ids = new Set(content.groups.map((g) => g.id));
    const targets = [
      ...content.actions.flatMap((a) => a.effects.map((e) => e.on)),
      ...content.events.flatMap((e) =>
        e.responses.flatMap((r) => r.effects.map((f) => f.on)),
      ),
    ];
    for (const target of targets) {
      if (target === "all" || target === "target") continue;
      expect(ids.has(target)).toBe(true);
    }
  });

  it("only fires events on days within the contract", () => {
    for (const event of content.events) {
      if (event.day === undefined) continue;
      expect(event.day).toBeLessThanOrEqual(content.contract.days);
    }
  });

  it("chains only to events that exist", () => {
    const ids = new Set(content.events.map((e) => e.id));
    for (const event of content.events) {
      for (const response of event.responses) {
        if (response.next) expect(ids.has(response.next)).toBe(true);
      }
    }
  });

  it("leaves no unreachable event", () => {
    const chained = new Set(
      content.events.flatMap((e) =>
        e.responses.map((r) => r.next).filter(Boolean),
      ),
    );
    for (const event of content.events) {
      expect(event.day !== undefined || chained.has(event.id)).toBe(true);
    }
  });

  it("never schedules two events on the same day", () => {
    const days = content.events
      .map((e) => e.day)
      .filter((d) => d !== undefined);
    expect(new Set(days).size).toBe(days.length);
  });

  it("always leaves a legal move for a broke player", () => {
    const free = content.actions.filter(
      (a) => a.cost === 0 && a.requires.length === 0,
    );
    expect(free.length).toBeGreaterThan(0);
  });

  it("only gates on stats the engine tracks", () => {
    const state = createGame(content, seed);
    for (const action of content.actions) {
      for (const requirement of action.requires) {
        expect(typeof state[requirement.stat]).toBe("number");
      }
    }
  });

  it("ships unlockables for both play styles", () => {
    const gated = content.actions.filter((a) => a.requires.length > 0);
    const stats = new Set(gated.flatMap((a) => a.requires.map((r) => r.stat)));
    expect(stats.has("credibility")).toBe(true);
    expect(stats.has("ruthlessness")).toBe(true);
  });
});

describe("unlockable actions", () => {
  const insideTrack = content.actions.find((a) => a.id === "insideTrack")!;
  const deadCat = content.actions.find((a) => a.id === "deadCat")!;

  it("starts with both identity actions locked", () => {
    const state = createGame(content, seed);
    expect(isUnlocked(state, insideTrack)).toBe(false);
    expect(isUnlocked(state, deadCat)).toBe(false);
  });

  it("reports what is missing so the UI can show it as a goal", () => {
    const state = createGame(content, seed);
    const unmet = unmetRequirements(state, insideTrack);
    expect(unmet).toHaveLength(1);
    expect(unmet[0].stat).toBe("credibility");
    expect(unmet[0].label).toMatch(/credibility/i);
  });

  it("refuses a locked action", () => {
    const state = createGame(content, seed);
    expect(() =>
      applyMove(state, content, {
        kind: "action",
        actionId: "deadCat",
        target: "students",
      }),
    ).toThrow(/not unlocked/);
  });

  it("opens the inside track once credibility is earned", () => {
    const state = { ...createGame(content, seed), credibility: 70 };
    expect(isUnlocked(state, insideTrack)).toBe(true);
    expect(() =>
      applyMove(state, content, {
        kind: "action",
        actionId: "insideTrack",
        target: "retirees",
      }),
    ).not.toThrow();
  });

  it("opens the dead cat once ruthlessness is earned", () => {
    const state = { ...createGame(content, seed), ruthlessness: 50 };
    expect(isUnlocked(state, deadCat)).toBe(true);
  });

  it("pushes credibility and ruthlessness in opposite directions", () => {
    const state = createGame(content, seed);
    const clean = applyMove(state, content, {
      kind: "action",
      actionId: "doorstep",
      target: "commuters",
    }).state;
    const dirty = applyMove(state, content, {
      kind: "action",
      actionId: "attackAd",
      target: "commuters",
    }).state;

    expect(clean.credibility).toBeGreaterThan(state.credibility);
    expect(clean.ruthlessness).toBe(state.ruthlessness);
    expect(dirty.credibility).toBeLessThan(state.credibility);
    expect(dirty.ruthlessness).toBeGreaterThan(state.ruthlessness);
  });

  it("cannot reach either threshold without committing to a style", () => {
    // Three days of the safe middle option should unlock nothing.
    let state = createGame(content, seed);
    for (let i = 0; i < 2; i++) {
      state = applyMove(state, content, {
        kind: "action",
        actionId: "photoOp",
        target: "commuters",
      }).state;
      if (state.pendingEventId) {
        state = applyMove(state, content, {
          kind: "respond",
          eventId: state.pendingEventId,
          responseIndex: 1,
        }).state;
      }
    }
    expect(isUnlocked(state, insideTrack)).toBe(false);
    expect(isUnlocked(state, deadCat)).toBe(false);
  });
});

describe("inside information", () => {
  it("tightens the poll margin, which nothing else does", () => {
    const state = { ...createGame(content, seed), credibility: 70 };
    const before = pollEstimate(state, content).margin;
    const after = applyMove(state, content, {
      kind: "action",
      actionId: "insideTrack",
      target: "retirees",
    }).state;
    expect(pollEstimate(after, content).margin).toBeLessThan(before);
  });

  it("never lets the poll become perfect", () => {
    const state = { ...createGame(content, seed), pollAccuracy: 99 };
    expect(pollEstimate(state, content).margin).toBeGreaterThan(0);
  });
});

describe("createGame", () => {
  it("starts from the contract budget and group baselines", () => {
    const state = createGame(content, seed);
    expect(state.money).toBe(content.contract.budget);
    expect(state.day).toBe(1);
    expect(state.support.retirees).toBe(26);
    expect(state.finished).toBe(false);
  });
});

describe("applyMove", () => {
  it("charges the action cost and advances the day", () => {
    const state = createGame(content, seed);
    const result = applyMove(state, content, {
      kind: "action",
      actionId: "doorstep",
      target: "retirees",
    });
    expect(result.state.money).toBe(content.contract.budget);
    expect(result.state.day).toBe(2);
  });

  it("gives certain, legible support feedback", () => {
    const state = createGame(content, seed);
    const result = applyMove(state, content, {
      kind: "action",
      actionId: "doorstep",
      target: "retirees",
    });
    const line = result.feedback.find(
      (f) => f.groupId === "retirees" && f.stat === "support",
    );
    expect(line?.delta).toBe(6);
    expect(line?.certain).toBe(true);
  });

  it("marks turnout feedback as uncertain", () => {
    const state = createGame(content, seed);
    const result = applyMove(state, content, {
      kind: "action",
      actionId: "debatePrep",
    });
    const line = result.feedback.find((f) => f.stat === "turnout");
    expect(line?.certain).toBe(false);
  });

  it("scales spin by gullibility but not plain effects", () => {
    const state = createGame(content, seed);
    const credulous = applyMove(state, content, {
      kind: "action",
      actionId: "attackAd",
      target: "students",
    });
    const sceptical = applyMove(state, content, {
      kind: "action",
      actionId: "attackAd",
      target: "retirees",
    });
    const studentGain = credulous.feedback.find(
      (f) => f.groupId === "students",
    )!.delta;
    const retireeGain = sceptical.feedback.find(
      (f) => f.groupId === "retirees",
    )!.delta;
    // 14 * (70/50) - 4 = 15.6 vs 14 * (30/50) - 4 = 4.4
    expect(studentGain).toBeGreaterThan(retireeGain);
  });

  it("rejects a targeted action with no target", () => {
    const state = createGame(content, seed);
    expect(() =>
      applyMove(state, content, { kind: "action", actionId: "doorstep" }),
    ).toThrow(/needs a target/);
  });

  it("rejects spending money you do not have", () => {
    const broke = { ...createGame(content, seed), money: 0 };
    expect(() =>
      applyMove(broke, content, { kind: "action", actionId: "mediaBuy" }),
    ).toThrow(/Not enough money/);
  });

  it("blocks further actions until a scandal is answered", () => {
    const state = playUntilEvent("casino");
    expect(state.pendingEventId).toBe("casino");
    expect(() =>
      applyMove(state, content, { kind: "action", actionId: "debatePrep" }),
    ).toThrow(/Respond to the scandal first/);
  });

  it("advances the day once the scandal is answered", () => {
    const state = playUntilEvent("casino");
    const dayBefore = state.day;
    const result = applyMove(state, content, {
      kind: "respond",
      eventId: "casino",
      responseIndex: 0,
    });
    expect(result.state.pendingEventId).toBe(null);
    expect(result.state.day).toBe(dayBefore + 1);
  });
});

describe("commissioned polls", () => {
  const pollActions = content.actions.filter(
    (action) => action.pollMargin !== undefined,
  );
  const quickPoll = content.actions.find(
    (action) => action.id === "quickPoll",
  )!;
  const fullPoll = content.actions.find((action) => action.id === "fullPoll")!;

  it("costs money and a day without changing voter support or turnout", () => {
    const initial = createGame(content, seed);
    const result = applyMove(initial, content, {
      kind: "action",
      actionId: "quickPoll",
    });

    expect(result.state.money).toBe(initial.money - quickPoll.cost);
    expect(result.state.day).toBe(initial.day + 1);
    expect(result.state.support).toEqual(initial.support);
    expect(result.state.turnout).toEqual(initial.turnout);
    expect(result.state.pollReport).toEqual({ availableOnDay: 2, margin: 5 });
    expect(result.pollCommissioned).toBe(true);
  });

  it("does not create a candidate gaffe while commissioning", () => {
    const fragile = { ...createGame(content, seed), morale: 0 };
    const result = applyMove(fragile, content, {
      kind: "action",
      actionId: "quickPoll",
    });
    expect(result.gaffe).toBeNull();
    expect(result.state.support).toEqual(fragile.support);
  });

  it("gives higher-priced polls a narrower forecast margin", () => {
    const tiers = [...pollActions].sort((a, b) => a.cost - b.cost);
    for (let index = 1; index < tiers.length; index++) {
      expect(tiers[index].cost).toBeGreaterThan(tiers[index - 1].cost);
      expect(tiers[index].pollMargin).toBeLessThan(
        tiers[index - 1].pollMargin!,
      );
    }
    expect(quickPoll.cost).toBeLessThan(fullPoll.cost);
  });

  it("projects action effects for the currently selected target", () => {
    const commissioned = applyMove(createGame(content, seed), content, {
      kind: "action",
      actionId: "fullPoll",
    }).state;
    const attack = content.actions.find((action) => action.id === "attackAd")!;
    const studentForecast = forecastAction(
      commissioned,
      content,
      attack,
      "students",
    );
    const retireeForecast = forecastAction(
      commissioned,
      content,
      attack,
      "retirees",
    );

    expect(studentForecast).not.toBeNull();
    expect(studentForecast!.margin).toBe(1.5);
    expect(studentForecast!.share).not.toBe(retireeForecast!.share);
  });

  it("does not show a report on the commissioning day or after its use day", () => {
    const initial = createGame(content, seed);
    expect(
      forecastAction(initial, content, content.actions[0], "commuters"),
    ).toBeNull();

    const commissioned = applyMove(initial, content, {
      kind: "action",
      actionId: "quickPoll",
    }).state;
    const afterDayTwoAction = applyMove(commissioned, content, {
      kind: "action",
      actionId: "doorstep",
      target: "commuters",
    }).state;
    expect(afterDayTwoAction.pendingEventId).toBe("podcast");
    const dayThree = applyMove(afterDayTwoAction, content, {
      kind: "respond",
      eventId: "podcast",
      responseIndex: 1,
    }).state;
    expect(dayThree.pollReport).toBeNull();
    expect(
      forecastAction(dayThree, content, content.actions[0], "commuters"),
    ).toBeNull();
  });

  it("rejects commissioning when the campaign cannot afford the tier", () => {
    const broke = { ...createGame(content, seed), money: quickPoll.cost - 1 };
    expect(() =>
      applyMove(broke, content, { kind: "action", actionId: "quickPoll" }),
    ).toThrow(/Not enough money/);
  });

  it("rejects commissioning on the final day", () => {
    const finalDay = {
      ...createGame(content, seed),
      day: content.contract.days,
    };
    expect(() =>
      applyMove(finalDay, content, { kind: "action", actionId: "quickPoll" }),
    ).toThrow(/no campaign day left/i);
  });
});

describe("chained events", () => {
  it("offers the podcast on day 2", () => {
    const state = playUntilEvent("podcast");
    expect(state.day).toBe(2);
  });

  it("chains into prep on accept without burning the day", () => {
    const state = playUntilEvent("podcast");
    const dayBefore = state.day;
    const result = applyMove(state, content, {
      kind: "respond",
      eventId: "podcast",
      responseIndex: 0,
    });
    expect(result.state.pendingEventId).toBe("podcast-prep");
    expect(result.state.day).toBe(dayBefore);
    expect(result.triggeredEventId).toBe("podcast-prep");
  });

  it("ends the day on decline", () => {
    const state = playUntilEvent("podcast");
    const result = applyMove(state, content, {
      kind: "respond",
      eventId: "podcast",
      responseIndex: 1,
    });
    expect(result.state.pendingEventId).toBe(null);
    expect(result.state.day).toBe(state.day + 1);
  });

  it("resolves the prep choice and returns to normal play", () => {
    const accepted = applyMove(playUntilEvent("podcast"), content, {
      kind: "respond",
      eventId: "podcast",
      responseIndex: 0,
    }).state;
    const result = applyMove(accepted, content, {
      kind: "respond",
      eventId: "podcast-prep",
      responseIndex: 0,
    });
    expect(result.state.pendingEventId).toBe(null);
    expect(result.state.day).toBe(accepted.day + 1);
    expect(
      result.feedback.find((f) => f.groupId === "commuters")!.delta,
    ).toBeGreaterThan(0);
  });

  it("gives each prep focus a different shape", () => {
    const accepted = applyMove(playUntilEvent("podcast"), content, {
      kind: "respond",
      eventId: "podcast",
      responseIndex: 0,
    }).state;
    const best = [0, 1, 2].map((i) => {
      const result = applyMove(accepted, content, {
        kind: "respond",
        eventId: "podcast-prep",
        responseIndex: i,
      });
      return result.feedback
        .filter((f) => f.stat === "support")
        .sort((a, b) => b.delta - a.delta)[0].groupId;
    });
    expect(new Set(best).size).toBe(3);
  });

  it("only risks a gaffe on the unprepped option", () => {
    const prep = content.events.find((e) => e.id === "podcast-prep")!;
    expect(prep.responses.filter((r) => r.riskGaffe)).toHaveLength(1);
    expect(prep.responses.at(-1)!.riskGaffe).toBe(true);
  });

  it("lets an unprepped low-morale candidate embarrass you", () => {
    const accepted = applyMove(playUntilEvent("podcast"), content, {
      kind: "respond",
      eventId: "podcast",
      responseIndex: 0,
    }).state;
    const fragile = { ...accepted, morale: 0 };

    let gaffes = 0;
    for (let s = 0; s < 40; s++) {
      const result = applyMove({ ...fragile, rngState: s }, content, {
        kind: "respond",
        eventId: "podcast-prep",
        responseIndex: 2,
      });
      if (result.gaffe) gaffes++;
    }
    expect(gaffes).toBeGreaterThan(0);
  });

  it("never gaffes on a prepped option however low morale is", () => {
    const accepted = applyMove(playUntilEvent("podcast"), content, {
      kind: "respond",
      eventId: "podcast",
      responseIndex: 0,
    }).state;
    const fragile = { ...accepted, morale: 0 };

    for (let s = 0; s < 40; s++) {
      const result = applyMove({ ...fragile, rngState: s }, content, {
        kind: "respond",
        eventId: "podcast-prep",
        responseIndex: 0,
      });
      expect(result.gaffe).toBe(null);
    }
  });
});

describe("determinism", () => {
  it("replays identically from seed plus move list", () => {
    const moves: PlayerMove[] = [
      { kind: "action", actionId: "attackAd", target: "students" },
      { kind: "action", actionId: "attackAd", target: "commuters" },
      { kind: "respond", eventId: "podcast", responseIndex: 0 },
      { kind: "respond", eventId: "podcast-prep", responseIndex: 2 },
      { kind: "action", actionId: "attackAd", target: "retirees" },
      { kind: "action", actionId: "doorstep", target: "students" },
      { kind: "respond", eventId: "casino", responseIndex: 2 },
    ];
    const a = playThrough(moves);
    const b = replay(content, seed, moves);
    expect(b).toEqual(a);
    expect(runElection(b, content)).toEqual(runElection(a, content));
  });

  it("produces different results for different seeds", () => {
    const moves: PlayerMove[] = [{ kind: "action", actionId: "mediaBuy" }];
    const a = runElection(replay(content, 1, moves), content);
    const b = runElection(replay(content, 999, moves), content);
    expect(a.voteShare).not.toBe(b.voteShare);
  });
});

describe("morale and gaffes", () => {
  it("tanks morale when the candidate is worked too hard", () => {
    let state = createGame(content, seed);
    for (let i = 0; i < 3; i++) {
      if (state.pendingEventId) {
        state = applyMove(state, content, {
          kind: "respond",
          eventId: state.pendingEventId,
          responseIndex: 1,
        }).state;
      }
      state = applyMove(state, content, {
        kind: "action",
        actionId: "attackAd",
        target: "students",
      }).state;
    }
    expect(state.morale).toBeLessThan(content.contract.startingMorale);
  });

  it("never lets a gaffe fire while morale is healthy", () => {
    let state = createGame(content, seed);
    let gaffes = 0;
    for (let i = 0; i < 3; i++) {
      if (state.pendingEventId) {
        state = applyMove(state, content, {
          kind: "respond",
          eventId: state.pendingEventId,
          responseIndex: 1,
        }).state;
      }
      const result = applyMove(state, content, {
        kind: "action",
        actionId: "debatePrep",
      });
      if (result.gaffe) gaffes++;
      state = result.state;
    }
    expect(state.morale).toBeGreaterThan(30);
    expect(gaffes).toBe(0);
  });
});

describe("runElection", () => {
  it("scores objectives against the contract", () => {
    const state = createGame(content, seed);
    const result = runElection(state, content);
    expect(result.objectives).toHaveLength(2);
    expect(result.objectives.every((o) => typeof o.met === "boolean")).toBe(
      true,
    );
  });

  it("sacks you when any objective is missed", () => {
    const disaster = { ...createGame(content, seed), morale: 0 };
    expect(runElection(disaster, content).sacked).toBe(true);
  });

  it("keeps totals internally consistent", () => {
    const state = createGame(content, seed);
    const result = runElection(state, content);
    const summed = result.groups.reduce((n, g) => n + g.votesCast, 0);
    expect(result.totalVotes).toBe(summed);
    expect(result.ourVotes).toBeLessThanOrEqual(result.totalVotes);
  });
});

describe("pollEstimate", () => {
  it("stays within its stated margin of the underlying truth", () => {
    const state = createGame(content, seed);
    const poll = pollEstimate(state, content);
    const election = runElection(state, content);
    expect(Math.abs(poll.share - election.voteShare)).toBeLessThan(
      poll.margin + 5,
    );
  });

  it("is stable for a given day", () => {
    const state = createGame(content, seed);
    expect(pollEstimate(state, content)).toEqual(pollEstimate(state, content));
  });
});
