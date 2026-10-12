import { version } from "$app/environment";
import { z } from "zod/v3";
import type { CareerEntry } from "./sim/career";

/** Earlier keys held sequential campaign records and are deliberately ignored. */
const KEY = "spin-doctors:career:v4";

const moveSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("action"),
    actionId: z.string(),
    target: z.string().optional(),
  }),
  z.object({
    kind: z.literal("poll"),
    actionId: z.string(),
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

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((date) => {
    const parsed = new Date(`${date}T12:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === date
    );
  }, "Invalid calendar date");

const savedCareerSchema = z.object({
  careerSeed: z.number(),
  log: z.array(entrySchema),
  startedVersion: z.string().optional(),
  savedVersion: z.string().optional(),
  calendarDate: calendarDateSchema,
  pendingElectionReminders: z
    .array(
      z.object({
        campaignId: z.number().int().min(0),
        date: calendarDateSchema,
      }),
    )
    .optional(),
});

export interface SavedCareer {
  careerSeed: number;
  log: CareerEntry[];
  /** Builds that began and last wrote this career, for bug reports; absent on older saves. */
  startedVersion?: string;
  savedVersion?: string;
  calendarDate: string;
  pendingElectionReminders?: { campaignId: number; date: string }[];
}

/** Null for no save or an unreadable one; the caller starts a fresh career. */
export function loadCareer(): SavedCareer | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const parsed = savedCareerSchema.safeParse(JSON.parse(raw));
  if (!parsed.success)
    throw new Error(
      "Your saved career is unreadable. Start a new career from Settings.",
    );
  return parsed.data;
}

export function saveCareer(saved: SavedCareer): void {
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...saved, savedVersion: version }),
  );
}

export function discardLegacyCareer(): boolean {
  const key = "spin-doctors:career:v3";
  if (localStorage.getItem(key) === null) return false;
  localStorage.removeItem(key);
  return true;
}
