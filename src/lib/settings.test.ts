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

    expect(loadSettings()).toEqual({ experimental: false });
    expect(defaultSettings.experimental).toBe(false);
  });

  it("round-trips the experimental flag", () => {
    useMemoryStorage();

    saveSettings({ experimental: true });

    expect(loadSettings().experimental).toBe(true);
  });

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

    expect(() => saveSettings({ experimental: true })).not.toThrow();
    expect(loadSettings()).toEqual(defaultSettings);
  });
});
