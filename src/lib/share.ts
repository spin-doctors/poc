import type { PlayerMove, StartingStats } from "./sim/types";

/** Seed + moves is the whole save. Small enough to live in a URL. */
export interface RunCode {
  seed: number;
  moves: PlayerMove[];
  /** Absent in links made before scenarios existed. */
  scenarioId?: string;
  /** Career stats carried into the campaign; absent means the contract defaults. */
  start?: StartingStats;
}

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

export function encodeRun(run: RunCode): string {
  const compact: unknown[] = [
    run.seed,
    run.moves.map((m) =>
      m.kind === "action"
        ? ["a", m.actionId, m.target ?? ""]
        : ["r", m.eventId, m.responseIndex],
    ),
    run.scenarioId ?? "",
  ];
  if (run.start)
    compact.push([
      run.start.credibility,
      run.start.ruthlessness,
      run.start.personalFunds,
    ]);
  return toBase64Url(JSON.stringify(compact));
}

export function decodeRun(code: string): RunCode | null {
  try {
    const [seed, moves, scenarioId, start] = JSON.parse(fromBase64Url(code));
    if (typeof seed !== "number" || !Array.isArray(moves)) return null;
    if (scenarioId !== undefined && typeof scenarioId !== "string") return null;
    if (
      start !== undefined &&
      !(
        Array.isArray(start) &&
        start.length === 3 &&
        start.every((n) => typeof n === "number")
      )
    )
      return null;
    return {
      seed,
      scenarioId: scenarioId || undefined,
      start: start
        ? {
            credibility: start[0],
            ruthlessness: start[1],
            personalFunds: start[2],
          }
        : undefined,
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
