import { describe, expect, it } from "vitest";
import { localDate, reconcileCalendar } from "./calendar";
import type { SavedCareer } from "./careerStorage";
import { defaultScenarioId, scenarios } from "./content";
import { reminderDays } from "./reminderSchedule";
import { applyCareerEntry, startCareer } from "./sim/career";
import { createGame } from "./sim/engine";

const saved: SavedCareer = {
  careerSeed: 42,
  log: [{ kind: "accept", scenarioId: defaultScenarioId }],
  calendarDate: "2026-10-12",
};
const initial = applyCareerEntry(
  startCareer(scenarios, defaultScenarioId, 42),
  scenarios,
  saved.log[0],
);

describe("campaign reminder eligibility", () => {
  it("includes today's unfinished move, future moves and a separate election", () => {
    const days = reminderDays(initial, saved, scenarios);
    expect(days).toHaveLength(8);
    expect(days[0]).toEqual({ date: "2026-10-12", kind: "actions" });
    expect(days.at(-1)).toEqual({ date: "2026-10-19", kind: "election" });
  });

  it("excludes optional polling once today's move and events are finished", () => {
    const career = {
      ...initial,
      active: initial.active.map((campaign) => ({
        ...campaign,
        state: { ...campaign.state, turnTaken: true },
      })),
    };
    expect(reminderDays(career, saved, scenarios)[0].date).toBe("2026-10-13");
    career.active[0].state.pendingEventId = "unfinished-event";
    expect(reminderDays(career, saved, scenarios)[0].date).toBe("2026-10-12");
  });

  it("keeps today's reminder if another account has work and deduplicates dates", () => {
    const done = {
      ...initial.active[0],
      state: { ...initial.active[0].state, turnTaken: true },
    };
    const career = {
      ...initial,
      active: [done, { ...initial.active[0], id: 1 }],
    };
    expect(reminderDays(career, saved, scenarios)).toHaveLength(8);
    expect(reminderDays(career, saved, scenarios)[0].date).toBe(
      saved.calendarDate,
    );
  });

  it("retains today's unseen election reminder through reconciliation and reload", () => {
    const next = reconcileCalendar(initial, saved, scenarios, "2026-10-19");
    expect(next.saved.pendingElectionReminders).toEqual([
      { campaignId: 0, date: "2026-10-19" },
    ]);
    expect(reminderDays(next.career, next.saved, scenarios)).toEqual([
      { date: "2026-10-19", kind: "election" },
    ]);
    expect(
      reminderDays(
        next.career,
        { ...next.saved, pendingElectionReminders: [] },
        scenarios,
      ),
    ).toEqual([]);
  });

  it("keeps an account's election reminder separate from another account's move", () => {
    const career = {
      ...initial,
      active: [
        ...initial.active,
        {
          id: 1,
          scenarioId: "parliamentary-harwell",
          state: createGame(scenarios["parliamentary-harwell"], 42),
        },
      ],
    };
    expect(
      reminderDays(career, saved, scenarios).filter(
        (day) => day.date === "2026-10-19",
      ),
    ).toEqual([
      { date: "2026-10-19", kind: "actions" },
      { date: "2026-10-19", kind: "election" },
    ]);
  });

  it("does not redate an old election after missed days", () => {
    const next = reconcileCalendar(initial, saved, scenarios, "2026-11-01");
    expect(next.saved.pendingElectionReminders).toEqual([]);
    expect(reminderDays(next.career, next.saved, scenarios)).toEqual([]);
  });

  it("uses calendar dates across DST and retains outstanding election dates", () => {
    const nextSaved = {
      ...saved,
      calendarDate: localDate(new Date(2026, 2, 28, 12)),
    };
    expect(reminderDays(initial, nextSaved, scenarios)[1].date).toBe(
      "2026-03-29",
    );
  });
});
