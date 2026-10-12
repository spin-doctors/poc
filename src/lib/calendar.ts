import type { SavedCareer } from "./careerStorage";
import type { Content } from "./schema/content";
import { applyCareerEntry, type CareerState } from "./sim/career";

export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function nextMidnight(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

export function offsetDate(date: string, offset: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return localDate(new Date(year, month - 1, day + offset, 12));
}

export function reconcileCalendar(
  career: CareerState,
  saved: SavedCareer,
  scenarios: Record<string, Content>,
  today: string,
): { career: CareerState; saved: SavedCareer; ticks: number } {
  if (today <= saved.calendarDate) return { career, saved, ticks: 0 };
  let next = career;
  let date = saved.calendarDate;
  const log = [...saved.log];
  const pendingElectionReminders = [...(saved.pendingElectionReminders ?? [])];
  let ticks = 0;
  while (date < today && next.active.length > 0) {
    const historyLength = next.history.length;
    next = applyCareerEntry(next, scenarios, { kind: "tick" });
    log.push({ kind: "tick" });
    ticks++;
    date = offsetDate(date, 1);
    for (const outcome of next.history.slice(historyLength))
      if (outcome.kind === "election")
        pendingElectionReminders.push({ campaignId: outcome.campaignId, date });
  }

  return {
    career: next,
    saved: {
      ...saved,
      log,
      calendarDate: today,
      pendingElectionReminders: pendingElectionReminders.filter(
        (reminder) => reminder.date >= today,
      ),
    },
    ticks,
  };
}

export function advanceTesterDay(
  career: CareerState,
  saved: SavedCareer,
  scenarios: Record<string, Content>,
  enabled: boolean,
  today: string,
): { career: CareerState; saved: SavedCareer } {
  if (!enabled)
    throw new Error(
      "Immediate advancement is available only in tester settings.",
    );
  if (career.active.length === 0)
    throw new Error("There is no active campaign to advance.");
  return {
    career: applyCareerEntry(career, scenarios, { kind: "tick" }),
    saved: {
      ...saved,
      log: [...saved.log, { kind: "tick" }],
      calendarDate: today > saved.calendarDate ? today : saved.calendarDate,
    },
  };
}
