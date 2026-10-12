import { z } from "zod/v3";

const KEY = "spin-doctors:settings:v1";

export const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid reminder time.");

const settingsSchema = z.object({
  /** Playtest-only systems (company, staff) that are not part of the core loop yet. */
  experimental: z.boolean().catch(false).default(false),
  instantAdvance: z.boolean().catch(false).default(false),
  reminders: z.boolean().catch(false).default(false),
  reminderTime: reminderTimeSchema.default("09:00"),
});

export type GameSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: GameSettings = settingsSchema.parse({});

/** Unreadable or missing settings fall back to the defaults. */
export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    const parsed = settingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settingsSchema.parse(settings)));
}
