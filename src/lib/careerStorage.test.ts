import { version } from "$app/environment";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dismissWelcome,
  hasDismissedWelcome,
  loadCareer,
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

describe("career versions", () => {
  it("stamps the current build on every save", () => {
    useMemoryStorage();

    saveCareer({ careerSeed: 42, log: [], savedVersion: "0.0.1+old" });

    expect(loadCareer()?.savedVersion).toBe(version);
  });

  it("keeps the build that started the career", () => {
    useMemoryStorage();

    saveCareer({ careerSeed: 42, log: [], startedVersion: "0.0.1+old" });

    expect(loadCareer()?.startedVersion).toBe("0.0.1+old");
  });

  it("loads saves written before versions were recorded", () => {
    const { values } = useMemoryStorage();
    values.set(
      "spin-doctors:career:v3",
      JSON.stringify({ careerSeed: 7, log: [{ kind: "tick" }] }),
    );

    expect(loadCareer()).toEqual({ careerSeed: 7, log: [{ kind: "tick" }] });
  });
});

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
