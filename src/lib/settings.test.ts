import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, loadSettings, saveSettings } from "./settings";

function useMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  });
  return values;
}

afterEach(() => vi.unstubAllGlobals());

describe("game settings", () => {
  it("hides experimental features by default", () => {
    useMemoryStorage();

    expect(loadSettings()).toEqual({
      experimental: false,
      instantAdvance: false,
      language: "en",
      reminders: false,
      reminderTime: "09:00",
    });
    expect(defaultSettings.experimental).toBe(false);
  });

  it("round-trips the experimental flag", () => {
    useMemoryStorage();

    saveSettings({ ...defaultSettings, experimental: true });

    expect(loadSettings().experimental).toBe(true);
  });

  it("round-trips the selected language", () => {
    useMemoryStorage();
    saveSettings({ ...defaultSettings, language: "es" });
    expect(loadSettings().language).toBe("es");
  });

  it("defaults the language for existing settings and rejects unsupported languages", () => {
    useMemoryStorage({
      "spin-doctors:settings:v1": JSON.stringify({ reminders: true }),
    });
    expect(loadSettings()).toEqual({ ...defaultSettings, reminders: true });

    useMemoryStorage({
      "spin-doctors:settings:v1": JSON.stringify({ language: "fr" }),
    });
    expect(loadSettings()).toEqual(defaultSettings);
  });

  it("adds a morning reminder time to existing settings without losing opt-in", () => {
    useMemoryStorage({
      "spin-doctors:settings:v1": JSON.stringify({ reminders: true }),
    });
    expect(loadSettings()).toEqual({ ...defaultSettings, reminders: true });
    expect(loadSettings().reminderTime).toBe("09:00");
  });

  it("round-trips a custom local time", () => {
    useMemoryStorage();
    saveSettings({ ...defaultSettings, reminderTime: "18:45" });
    expect(loadSettings().reminderTime).toBe("18:45");
  });

  it.each(["", "9:00", "24:00", "12:60"])(
    "rejects invalid reminder time %s on save",
    (reminderTime) => {
      useMemoryStorage();
      saveSettings({ ...defaultSettings, reminderTime: "18:45" });
      expect(() =>
        saveSettings({ ...defaultSettings, reminderTime }),
      ).toThrow();
      expect(loadSettings().reminderTime).toBe("18:45");
    },
  );

  it("falls back to defaults for unreadable settings", () => {
    useMemoryStorage({ "spin-doctors:settings:v1": "{not json" });
    expect(loadSettings()).toEqual(defaultSettings);

    useMemoryStorage({
      "spin-doctors:settings:v1": JSON.stringify({ experimental: "yes" }),
    });
    expect(loadSettings()).toEqual(defaultSettings);
  });

  it("survives storage being unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });

    expect(() =>
      saveSettings({ ...defaultSettings, experimental: true }),
    ).toThrow(/denied/);
    expect(loadSettings()).toEqual(defaultSettings);
  });
});
