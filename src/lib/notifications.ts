import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications";

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
 * remainingDays counts future local midnights, with election night at the last.
 * Zero clears reminders. Above 60 days, retain the first 59 plus election night.
 * Callers disable this for tester mode or no active campaigns. Permission is
 * requested separately; plugin failures reject. Calls serialize, latest wins.
 */
export function replaceDailyReminders({
  enabled,
  remainingDays,
}: {
  enabled: boolean;
  remainingDays: number;
}): Promise<void> {
  if (!isSupported()) return Promise.resolve();
  const replacement = replacementQueue.then(async () => {
    const notifications: LocalNotificationSchema[] = [];
    if (enabled) {
      if (!Number.isSafeInteger(remainingDays) || remainingDays < 0) {
        throw new RangeError(
          "remainingDays must be a non-negative safe integer.",
        );
      }
      const now = new Date();
      for (
        let index = 0;
        index < Math.min(remainingDays, MAX_REMINDERS);
        index++
      ) {
        const offset = index === MAX_REMINDERS - 1 ? remainingDays : index + 1;
        // Calendar arithmetic preserves local midnight across DST transitions.
        const at = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + offset,
        );
        if (!Number.isFinite(at.getTime())) {
          throw new RangeError(
            "remainingDays exceeds the supported date range.",
          );
        }
        notifications.push({
          id: FIRST_REMINDER_ID + index,
          title: "Spin Doctors",
          body: "Your campaigns are waiting. Return to Spin Doctors.",
          schedule: { at },
          isExactNotification: false,
        });
      }
    }
    await LocalNotifications.cancel({ notifications: ownedNotifications });
    if (
      notifications.length > 0 &&
      (await getNotificationPermission()) === "granted"
    ) {
      await LocalNotifications.schedule({ notifications });
    }
  });
  replacementQueue = replacement.catch(() => {});
  return replacement;
}

/**
 * Listen only to owned reminder taps. Await registration before storing cleanup.
 * Cleanup is idempotent; asynchronous removal failures are reported to console.
 */
export async function onReminderTap(callback: () => void): Promise<() => void> {
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
        callback();
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
