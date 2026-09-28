import { describe, expect, it } from "vitest";
import { content } from "./content";
import { applyMove, createGame, runElection } from "./sim/engine";
import type { PlayerMove } from "./sim/types";
import { decodeRun, encodeRun } from "./share";

const moves: PlayerMove[] = [
  { kind: "action", actionId: "doorstep", target: "commuters" },
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
  });
});
