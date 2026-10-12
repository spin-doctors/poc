import { describe, expect, it } from "vitest";
import {
  advanceTesterDay,
  localDate,
  nextMidnight,
  reconcileCalendar,
} from "./calendar";
import type { SavedCareer } from "./careerStorage";
import { defaultScenarioId, scenarios } from "./content";
import { applyCareerEntry, replayCareer, startCareer } from "./sim/career";

const saved: SavedCareer = {
  careerSeed: 42,
  log: [{ kind: "accept", scenarioId: defaultScenarioId }],
  calendarDate: "2026-03-28",
};
const initial = applyCareerEntry(
  startCareer(scenarios, defaultScenarioId, 42),
  scenarios,
  saved.log[0],
);

describe("calendar reconciliation", () => {
  it("does not advance on reload or a backwards clock", () => {
    expect(
      reconcileCalendar(initial, saved, scenarios, saved.calendarDate).ticks,
    ).toBe(0);
    expect(
      reconcileCalendar(initial, saved, scenarios, "2026-03-27").saved,
    ).toBe(saved);
  });
  it("counts calendar boundaries across the DST weekend, not elapsed 24-hour blocks", () => {
    const next = reconcileCalendar(initial, saved, scenarios, "2026-03-30");
    expect(next.ticks).toBe(2);
    expect(next.career.active[0].state.morale).toBe(
      initial.active[0].state.morale - 10,
    );
    expect(
      replayCareer(scenarios, defaultScenarioId, 42, next.saved.log),
    ).toEqual(next.career);
    expect(
      reconcileCalendar(next.career, next.saved, scenarios, "2026-03-30").ticks,
    ).toBe(0);
  });
  it("stops at the election and never accepts a future client during absence", () => {
    const next = reconcileCalendar(initial, saved, scenarios, "2026-10-12");
    expect(next.ticks).toBe(7);
    expect(next.career.active).toHaveLength(0);
    expect(next.career.history).toHaveLength(1);
    expect(next.saved.calendarDate).toBe("2026-10-12");
  });
  it("computes local midnight with calendar arithmetic", () => {
    const now = new Date(2026, 9, 12, 23, 59);
    expect(localDate(nextMidnight(now))).toBe("2026-10-13");
    expect(nextMidnight(now).getHours()).toBe(0);
  });
  it("gates manual advancement and reanchors its boundary atomically", () => {
    expect(() =>
      advanceTesterDay(initial, saved, scenarios, false, "2026-03-30"),
    ).toThrow(/tester/);
    const advanced = advanceTesterDay(
      initial,
      saved,
      scenarios,
      true,
      "2026-03-30",
    );
    expect(advanced.career.day).toBe(initial.day + 1);
    expect(advanced.saved.calendarDate).toBe("2026-03-30");
    expect(
      reconcileCalendar(
        advanced.career,
        advanced.saved,
        scenarios,
        "2026-03-30",
      ).ticks,
    ).toBe(0);
    expect(
      replayCareer(scenarios, defaultScenarioId, 42, advanced.saved.log),
    ).toEqual(advanced.career);
  });
});
