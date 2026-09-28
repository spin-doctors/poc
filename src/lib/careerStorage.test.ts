import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dismissWelcome,
  hasDismissedWelcome,
  saveCareer,
} from "./careerStorage";

function useMemoryStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
  vi.stubGlobal("localStorage", storage);
  return { storage, values };
}

afterEach(() => vi.unstubAllGlobals());

describe("welcome dismissal", () => {
  it("shows as unseen until dismissed", () => {
    useMemoryStorage();

    expect(hasDismissedWelcome()).toBe(false);
    dismissWelcome();
    expect(hasDismissedWelcome()).toBe(true);
  });

  it("stores dismissal separately from career progress", () => {
    const { values } = useMemoryStorage();

    saveCareer({ careerSeed: 42, log: [] });
    dismissWelcome();

    expect(values.size).toBe(2);
    expect(hasDismissedWelcome()).toBe(true);
  });

  it("fails open when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Storage is unavailable");
      },
      setItem: () => {
        throw new Error("Storage is unavailable");
      },
    });

    expect(hasDismissedWelcome()).toBe(false);
    expect(() => dismissWelcome()).not.toThrow();
  });
});
