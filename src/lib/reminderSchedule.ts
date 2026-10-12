import { offsetDate } from "./calendar";
import type { SavedCareer } from "./careerStorage";
import type { Content } from "./schema/content";
import type { CareerState } from "./sim/career";

export interface ReminderDay {
  date: string;
  kind: "actions" | "election";
}

export function reminderDays(
  career: CareerState,
  saved: SavedCareer,
  scenarios: Record<string, Content>,
): ReminderDay[] {
  const days = new Map<string, ReminderDay>();
  const add = (date: string, kind: ReminderDay["kind"]) =>
    days.set(`${date}:${kind}`, { date, kind });
  for (const campaign of career.active) {
    const remaining =
      scenarios[campaign.scenarioId].contract.days - campaign.state.day + 1;
    for (let offset = 0; offset <= remaining; offset++) {
      if (
        offset === 0 &&
        campaign.state.turnTaken &&
        !campaign.state.pendingEventId
      )
        continue;
      const date = offsetDate(saved.calendarDate, offset);
      const kind = offset === remaining ? "election" : "actions";
      add(date, kind);
    }
  }
  for (const reminder of saved.pendingElectionReminders ?? [])
    add(reminder.date, "election");
  return [...days.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind),
  );
}
