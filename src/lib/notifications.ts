import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications";
import type { ReminderDay } from "./reminderSchedule";
import { reminderTimeSchema } from "./settings";

export type NotificationPermission =
  "granted" | "denied" | "prompt" | "unsupported";

// Reserve these IDs exclusively for campaign reminders, below iOS's 64-item limit.
const FIRST_REMINDER_ID = 2_100_000;
const MAX_REMINDERS = 60;
const ownedNotifications = Array.from(
  { length: MAX_REMINDERS },
  (_, index) => ({
    id: FIRST_REMINDER_ID + index,
  }),
);
let replacementQueue: Promise<void> = Promise.resolve();

function isSupported() {
  return ["ios", "android"].includes(Capacitor.getPlatform());
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "unsupported";
  const { display } = await LocalNotifications.checkPermissions();
  return display === "prompt-with-rationale" ? "prompt" : display;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "unsupported";
  const { display } = await LocalNotifications.requestPermissions();
  return display === "prompt-with-rationale" ? "prompt" : display;
}

/**
 * Explicit local dates avoid shifting today's reminder to tomorrow on resume.
 * Above 60 dates, retain the first 59 plus the last campaign boundary.
 * Callers disable this for tester mode or opt-out. Permission is
 * requested separately; plugin failures reject. Calls serialize, latest wins.
 */
export function replaceDailyReminders({
  enabled,
  reminderTime,
  days,
}: {
  enabled: boolean;
  reminderTime: string;
  days: ReminderDay[];
}): Promise<void> {
  if (!isSupported()) return Promise.resolve();
  const snapshot = days.map((day) => ({ ...day }));
  const replacement = replacementQueue.then(async () => {
    const notifications: LocalNotificationSchema[] = [];
    if (enabled) {
      const [hour, minute] = reminderTimeSchema
        .parse(reminderTime)
        .split(":")
        .map(Number);
      const now = Date.now();
      const unique = new Map<string, ReminderDay>();
      for (const day of snapshot) {
        const parsed = new Date(`${day.date}T12:00:00Z`);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(day.date) ||
          !Number.isFinite(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== day.date ||
          !["actions", "election"].includes(day.kind)
        )
          throw new RangeError("Invalid reminder date or kind.");
        unique.set(`${day.date}:${day.kind}`, day);
      }
      const future = [...unique.values()]
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind),
        )
        .map((day) => {
          const [year, month, date] = day.date.split("-").map(Number);
          return { ...day, at: new Date(year, month - 1, date, hour, minute) };
        })
        .filter((day) => day.at.getTime() > now);
      const bounded =
        future.length > MAX_REMINDERS
          ? [...future.slice(0, MAX_REMINDERS - 1), future[future.length - 1]]
          : future;
      for (const [index, day] of bounded.entries()) {
        notifications.push({
          id: FIRST_REMINDER_ID + index,
          title: "Spin Doctors",
          body:
            day.kind === "election"
              ? "The count is in. Return to Spin Doctors for your election results."
              : "Your campaigns have unfinished moves or events. Return to Spin Doctors.",
          extra: { date: day.date, kind: day.kind },
          schedule: { at: day.at },
          isExactNotification: false,
        });
      }
    }
    await LocalNotifications.cancel({ notifications: ownedNotifications });
    if (
      notifications.length > 0 &&
      (await getNotificationPermission()) === "granted"
    ) {
      const upcoming = notifications.filter(
        (notification) =>
          notification.schedule?.at &&
          notification.schedule.at.getTime() > Date.now(),
      );
      if (upcoming.length > 0)
        await LocalNotifications.schedule({ notifications: upcoming });
    }
  });
  replacementQueue = replacement.catch(() => {});
  return replacement;
}

/**
 * Listen only to owned reminder taps. Await registration before storing cleanup.
 * Cleanup is idempotent; asynchronous removal failures are reported to console.
 */
export async function onReminderTap(
  callback: (kind: ReminderDay["kind"]) => void,
): Promise<() => void> {
  if (!isSupported()) return () => {};
  let active = true;
  const listener = await LocalNotifications.addListener(
    "localNotificationActionPerformed",
    ({ notification }) => {
      if (
        active &&
        notification.id >= FIRST_REMINDER_ID &&
        notification.id < FIRST_REMINDER_ID + MAX_REMINDERS
      ) {
        callback(
          notification.extra?.kind === "election" ? "election" : "actions",
        );
      }
    },
  );
  return () => {
    if (!active) return;
    active = false;
    void listener.remove().catch((error: unknown) => {
      console.error("Could not remove the reminder tap listener.", error);
    });
  };
}
