import { z } from "zod/v3";
import type { CareerEntry } from "./sim/career";

/** Earlier keys held sequential campaign records and are deliberately ignored. */
const KEY = "spin-doctors:career:v3";

const moveSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("action"),
    actionId: z.string(),
    target: z.string().optional(),
  }),
  z.object({
    kind: z.literal("respond"),
    eventId: z.string(),
    responseIndex: z.number().int().min(0),
  }),
]);

const entrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("accept"), scenarioId: z.string() }),
  z.object({
    kind: z.literal("move"),
    campaignId: z.number().int().min(0),
    move: moveSchema,
  }),
  z.object({ kind: z.literal("tick") }),
  z.object({
    kind: z.literal("incorporate"),
    profile: z.object({
      name: z.string(),
      logo: z.string().nullable(),
      values: z.array(z.string()),
    }),
  }),
  z.object({ kind: z.literal("hire") }),
]);

const savedCareerSchema = z.object({
  careerSeed: z.number(),
  log: z.array(entrySchema),
});

export interface SavedCareer {
  careerSeed: number;
  log: CareerEntry[];
}

/** Null for no save or an unreadable one; the caller starts a fresh career. */
export function loadCareer(): SavedCareer | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = savedCareerSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveCareer(saved: SavedCareer): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Private browsing or a full quota: the career just won't survive a reload.
  }
}
