import { version } from "$app/environment";
import { afterEach, describe, expect, it, vi } from "vitest";
import { discardLegacyCareer, loadCareer, saveCareer } from "./careerStorage";
import { loadSettings, saveSettings } from "./settings";

function useMemoryStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
  vi.stubGlobal("localStorage", storage);
  return { storage, values };
}

afterEach(() => vi.unstubAllGlobals());

describe("career versions", () => {
  it("stamps the current build on every save", () => {
    useMemoryStorage();

    saveCareer({
      careerSeed: 42,
      log: [],
      calendarDate: "2026-10-12",
      savedVersion: "0.0.1+old",
    });

    expect(loadCareer()?.savedVersion).toBe(version);
  });

  it("keeps the build that started the career", () => {
    useMemoryStorage();

    saveCareer({
      careerSeed: 42,
      log: [],
      calendarDate: "2026-10-12",
      startedVersion: "0.0.1+old",
    });

    expect(loadCareer()?.startedVersion).toBe("0.0.1+old");
  });

  it("does not reinterpret obsolete simulation saves", () => {
    const { values } = useMemoryStorage();
    values.set(
      "spin-doctors:career:v3",
      JSON.stringify({ careerSeed: 7, log: [{ kind: "tick" }] }),
    );

    expect(loadCareer()).toBeNull();
    expect(discardLegacyCareer()).toBe(true);
    expect(discardLegacyCareer()).toBe(false);
  });
  it("resets v4 careers once without touching saved settings", () => {
    const { values } = useMemoryStorage();
    values.set(
      "spin-doctors:career:v4",
      JSON.stringify({ careerSeed: 42, log: [] }),
    );
    saveSettings({
      reminderTime: "14:42",
      reminders: true,
      experimental: true,
      instantAdvance: false,
      language: "en",
    });
    expect(loadCareer()).toBeNull();
    expect(discardLegacyCareer()).toBe(true);
    expect(values.has("spin-doctors:career:v4")).toBe(false);
    expect(loadSettings()).toMatchObject({
      reminderTime: "14:42",
      reminders: true,
      experimental: true,
    });
    expect(discardLegacyCareer()).toBe(false);
  });
  it("round-trips poll entries and the processed calendar boundary", () => {
    useMemoryStorage();
    saveCareer({
      careerSeed: 7,
      calendarDate: "2026-10-12",
      log: [
        {
          kind: "move",
          campaignId: 0,
          move: { kind: "poll", actionId: "quickPoll" },
        },
      ],
    });
    expect(loadCareer()?.log[0]).toMatchObject({
      move: { kind: "poll", actionId: "quickPoll" },
    });
    expect(loadCareer()?.calendarDate).toBe("2026-10-12");
  });
  it("round-trips unseen election reminder dates without changing the replay log", () => {
    useMemoryStorage();
    const saved = {
      careerSeed: 7,
      calendarDate: "2026-10-12",
      log: [],
      pendingElectionReminders: [{ campaignId: 2, date: "2026-10-12" }],
    };
    saveCareer(saved);
    expect(loadCareer()).toMatchObject(saved);
  });
  it("rejects invalid dates and surfaces persistence failures", () => {
    const { values, storage } = useMemoryStorage();
    values.set(
      "spin-doctors:career:v5",
      JSON.stringify({ careerSeed: 7, log: [], calendarDate: "2026-02-30" }),
    );
    expect(loadCareer).toThrow(/unreadable/);
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() =>
      saveCareer({ careerSeed: 7, log: [], calendarDate: "2026-10-12" }),
    ).toThrow(/quota/);
  });
});
