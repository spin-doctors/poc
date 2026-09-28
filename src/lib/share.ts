import type { PlayerMove } from "./sim/types";

/** Seed + moves is the whole save. Small enough to live in a URL. */
export interface RunCode {
  seed: number;
  moves: PlayerMove[];
}

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

export function encodeRun(run: RunCode): string {
  const compact = [
    run.seed,
    run.moves.map((m) =>
      m.kind === "action"
        ? ["a", m.actionId, m.target ?? ""]
        : ["r", m.eventId, m.responseIndex],
    ),
  ];
  return toBase64Url(JSON.stringify(compact));
}

export function decodeRun(code: string): RunCode | null {
  try {
    const [seed, moves] = JSON.parse(fromBase64Url(code));
    if (typeof seed !== "number" || !Array.isArray(moves)) return null;
    return {
      seed,
      moves: moves.map((m: [string, string, string | number]) =>
        m[0] === "a"
          ? {
              kind: "action",
              actionId: m[1],
              target: m[2] === "" ? undefined : String(m[2]),
            }
          : { kind: "respond", eventId: m[1], responseIndex: Number(m[2]) },
      ),
    };
  } catch {
    return null;
  }
}
