import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  platform: "android",
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
  addListener: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => native.platform },
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: native,
}));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  native.platform = "android";
  native.checkPermissions.mockResolvedValue({ display: "granted" });
  native.requestPermissions.mockResolvedValue({ display: "granted" });
  native.cancel.mockResolvedValue(undefined);
  native.schedule.mockResolvedValue({ notifications: [] });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 10, 15, 30));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("native campaign reminders", () => {
  it("does not use native APIs on the web", async () => {
    native.platform = "web";
    const adapter = await import("./notifications");
    expect(await adapter.getNotificationPermission()).toBe("unsupported");
    expect(await adapter.requestNotificationPermission()).toBe("unsupported");
    await adapter.replaceDailyReminders({ enabled: true, remainingDays: 3 });
    const cleanup = await adapter.onReminderTap(vi.fn());
    cleanup();
    for (const method of [
      native.checkPermissions,
      native.requestPermissions,
      native.cancel,
      native.schedule,
      native.addListener,
    ]) {
      expect(method).not.toHaveBeenCalled();
    }
  });

  it.each(["ios", "android"])(
    "checks and explicitly requests permission on %s",
    async (platform) => {
      native.platform = platform;
      const adapter = await import("./notifications");
      for (const status of [
        "granted",
        "denied",
        "prompt",
        "prompt-with-rationale",
      ]) {
        native.checkPermissions.mockResolvedValueOnce({ display: status });
        native.requestPermissions.mockResolvedValueOnce({ display: status });
        const normalized =
          status === "prompt-with-rationale" ? "prompt" : status;
        expect(await adapter.getNotificationPermission()).toBe(normalized);
        expect(await adapter.requestNotificationPermission()).toBe(normalized);
      }
    },
  );

  it("replaces only owned IDs with one-shot inexact local midnights including election night", async () => {
    const { replaceDailyReminders } = await import("./notifications");
    await replaceDailyReminders({ enabled: true, remainingDays: 3 });
    const cancelled = native.cancel.mock.calls[0][0].notifications;
    expect(cancelled).toHaveLength(60);
    expect(cancelled[0]).toEqual({ id: 2_100_000 });
    expect(cancelled.at(-1)).toEqual({ id: 2_100_059 });
    const reminders = native.schedule.mock.calls[0][0].notifications;
    expect(reminders).toHaveLength(3);
    reminders.forEach(
      (
        reminder: {
          id: number;
          schedule: { at: Date };
          isExactNotification: boolean;
        },
        index: number,
      ) => {
        expect(reminder.id).toBe(2_100_000 + index);
        expect(reminder.schedule).toEqual({
          at: new Date(2026, 5, 11 + index),
        });
        expect(reminder.isExactNotification).toBe(false);
      },
    );
    expect(native.requestPermissions).not.toHaveBeenCalled();
  });

  it("bounds the queue while preserving a distant election night", async () => {
    const { replaceDailyReminders } = await import("./notifications");
    await replaceDailyReminders({ enabled: true, remainingDays: 100 });
    const reminders = native.schedule.mock.calls[0][0].notifications;
    expect(reminders).toHaveLength(60);
    expect(reminders[58].schedule.at).toEqual(new Date(2026, 5, 10 + 59));
    expect(reminders[59].schedule.at).toEqual(new Date(2026, 5, 10 + 100));
  });

  it.each([
    ["2026-03-28T12:00:00Z", 23],
    ["2026-10-24T12:00:00Z", 25],
  ])("uses calendar midnights across DST from %s", async (now, hours) => {
    vi.stubEnv("TZ", "Europe/London");
    vi.setSystemTime(new Date(now));
    const { replaceDailyReminders } = await import("./notifications");
    await replaceDailyReminders({ enabled: true, remainingDays: 2 });
    const [first, second] = native.schedule.mock.calls[0][0].notifications;
    expect(first.schedule.at.getHours()).toBe(0);
    expect(second.schedule.at.getHours()).toBe(0);
    expect(second.schedule.at.getTime() - first.schedule.at.getTime()).toBe(
      hours * 60 * 60 * 1000,
    );
  });

  it("clears reminders when disabled or no days remain without requesting permission", async () => {
    const { replaceDailyReminders } = await import("./notifications");
    await replaceDailyReminders({ enabled: false, remainingDays: NaN });
    await replaceDailyReminders({ enabled: true, remainingDays: 0 });
    expect(native.cancel).toHaveBeenCalledTimes(2);
    expect(native.schedule).not.toHaveBeenCalled();
    expect(native.checkPermissions).not.toHaveBeenCalled();
    expect(native.requestPermissions).not.toHaveBeenCalled();
  });

  it.each(["prompt", "denied"])(
    "clears but does not schedule with %s permission",
    async (display) => {
      native.checkPermissions.mockResolvedValue({ display });
      const { replaceDailyReminders } = await import("./notifications");
      await replaceDailyReminders({ enabled: true, remainingDays: 3 });
      expect(native.cancel).toHaveBeenCalledOnce();
      expect(native.schedule).not.toHaveBeenCalled();
      expect(native.requestPermissions).not.toHaveBeenCalled();
    },
  );

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    "rejects invalid horizon %s before modifying the queue",
    async (remainingDays) => {
      const { replaceDailyReminders } = await import("./notifications");
      await expect(
        replaceDailyReminders({ enabled: true, remainingDays }),
      ).rejects.toBeInstanceOf(RangeError);
      expect(native.cancel).not.toHaveBeenCalled();
      expect(native.schedule).not.toHaveBeenCalled();
    },
  );

  it("serializes replacements so a later disable clears an earlier schedule", async () => {
    const { replaceDailyReminders } = await import("./notifications");
    let resolve!: () => void;
    native.schedule.mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    const first = replaceDailyReminders({ enabled: true, remainingDays: 2 });
    const second = replaceDailyReminders({ enabled: false, remainingDays: 2 });
    await vi.waitFor(() => expect(native.schedule).toHaveBeenCalledOnce());
    expect(native.cancel).toHaveBeenCalledOnce();
    resolve();
    await Promise.all([first, second]);
    expect(native.cancel).toHaveBeenCalledTimes(2);
    expect(native.schedule).toHaveBeenCalledOnce();
  });

  it.each(["cancel", "schedule", "checkPermissions"] as const)(
    "propagates %s failures and recovers for later replacements",
    async (method) => {
      const error = new Error("native failure");
      native[method].mockRejectedValueOnce(error);
      const { replaceDailyReminders } = await import("./notifications");
      await expect(
        replaceDailyReminders({ enabled: true, remainingDays: 2 }),
      ).rejects.toBe(error);
      await expect(
        replaceDailyReminders({ enabled: true, remainingDays: 1 }),
      ).resolves.toBeUndefined();
    },
  );

  it("propagates permission and listener registration errors", async () => {
    const error = new Error("native failure");
    native.checkPermissions.mockRejectedValueOnce(error);
    native.requestPermissions.mockRejectedValueOnce(error);
    native.addListener.mockRejectedValueOnce(error);
    const adapter = await import("./notifications");
    await expect(adapter.getNotificationPermission()).rejects.toBe(error);
    await expect(adapter.requestNotificationPermission()).rejects.toBe(error);
    await expect(adapter.onReminderTap(vi.fn())).rejects.toBe(error);
  });

  it("handles only owned taps and cleans up idempotently", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    native.addListener.mockResolvedValue({ remove });
    const { onReminderTap } = await import("./notifications");
    const callback = vi.fn();
    const cleanup = await onReminderTap(callback);
    expect(native.addListener.mock.calls[0][0]).toBe(
      "localNotificationActionPerformed",
    );
    const tap = native.addListener.mock.calls[0][1];
    tap({ notification: { id: 1 } });
    tap({ notification: { id: 2_100_060 } });
    expect(callback).not.toHaveBeenCalled();
    tap({ notification: { id: 2_100_000 } });
    tap({ notification: { id: 2_100_059 } });
    expect(callback).toHaveBeenCalledTimes(2);
    cleanup();
    cleanup();
    tap({ notification: { id: 2_100_000 } });
    expect(callback).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("reports listener removal errors without unhandled rejections", async () => {
    const error = new Error("remove failed");
    native.addListener.mockResolvedValue({
      remove: vi.fn().mockRejectedValue(error),
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { onReminderTap } = await import("./notifications");
    const cleanup = await onReminderTap(vi.fn());
    cleanup();
    await Promise.resolve();
    expect(log).toHaveBeenCalledWith(
      "Could not remove the reminder tap listener.",
      error,
    );
  });
});
