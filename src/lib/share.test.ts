import { describe, expect, it } from "vitest";
import { content, scenarios } from "./content";
import { decodeRun, encodeRun } from "./share";
import { applyMove, createGame, replay, runElection } from "./sim/engine";
import type { PlayerMove } from "./sim/types";

const moves: PlayerMove[] = [
  { kind: "action", actionId: "quickPoll" },
  { kind: "action", actionId: "doorstep", target: "retirees" },
  { kind: "respond", eventId: "podcast", responseIndex: 0 },
  { kind: "respond", eventId: "podcast-prep", responseIndex: 1 },
  { kind: "action", actionId: "mediaBuy" },
];

describe("run codes", () => {
  it("round-trips a seed and move list", () => {
    const run = { seed: 987654, moves };
    expect(decodeRun(encodeRun(run))).toEqual(run);
  });

  it("survives an untargeted move without inventing a target", () => {
    const decoded = decodeRun(
      encodeRun({ seed: 1, moves: [{ kind: "action", actionId: "mediaBuy" }] }),
    );
    expect(decoded?.moves[0]).toEqual({
      kind: "action",
      actionId: "mediaBuy",
      target: undefined,
    });
  });

  it("reproduces the exact campaign, not just the inputs", () => {
    const seed = 424242;
    const decoded = decodeRun(encodeRun({ seed, moves }))!;

    let original = createGame(content, seed);
    for (const move of moves)
      original = applyMove(original, content, move).state;

    let replayed = createGame(content, decoded.seed);
    for (const move of decoded.moves)
      replayed = applyMove(replayed, content, move).state;

    expect(replayed).toEqual(original);
    expect(runElection(replayed, content)).toEqual(
      runElection(original, content),
    );
  });

  it("stays URL-safe", () => {
    const code = encodeRun({ seed: 2 ** 31 - 1, moves });
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(code)).toBe(code);
  });

  it("stays short enough to paste into a message", () => {
    expect(encodeRun({ seed: 2 ** 31 - 1, moves }).length).toBeLessThan(300);
  });

  it("returns null for rubbish rather than throwing", () => {
    expect(decodeRun("not-a-valid-code")).toBe(null);
    expect(decodeRun("")).toBe(null);
    expect(decodeRun(btoa('{"nonsense":true}'))).toBe(null);
    expect(decodeRun(btoa(JSON.stringify([1, [], 7])))).toBe(null);
    expect(decodeRun(btoa(JSON.stringify([1, [], "x", [1, 2]])))).toBe(null);
  });

  it("still opens links made before scenarios existed", () => {
    const legacy = btoa(JSON.stringify([5, [["a", "mediaBuy", ""]]]));
    expect(decodeRun(legacy)).toEqual({
      seed: 5,
      moves: [{ kind: "action", actionId: "mediaBuy", target: undefined }],
    });
  });

  it("carries the scenario and career stats a campaign started with", () => {
    const run = {
      seed: 77,
      moves: [{ kind: "action" as const, actionId: "mediaBuy" }],
      scenarioId: "parliamentary-harwell",
      start: { credibility: 63, ruthlessness: 21.5, personalFunds: 31000 },
    };
    const decoded = decodeRun(encodeRun(run))!;
    expect(decoded).toEqual(run);

    const harwell = scenarios[decoded.scenarioId!];
    expect(replay(harwell, decoded.seed, decoded.moves, decoded.start)).toEqual(
      replay(harwell, run.seed, run.moves, run.start),
    );
    expect(
      replay(harwell, decoded.seed, decoded.moves, decoded.start).credibility,
    ).toBe(63);
  });
});
