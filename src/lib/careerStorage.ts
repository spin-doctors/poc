import { z } from "zod/v3";
import type { CampaignRecord } from "./sim/career";

const KEY = "spin-doctors:career:v1";

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

const recordSchema = z.object({
  scenarioId: z.string(),
  seed: z.number(),
  moves: z.array(moveSchema),
});

const savedCareerSchema = z.object({
  careerSeed: z.number(),
  completed: z.array(recordSchema),
  /** Null between campaigns, while offers are on the table. */
  current: recordSchema.nullable(),
});

export interface SavedCareer {
  careerSeed: number;
  completed: CampaignRecord[];
  current: CampaignRecord | null;
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
