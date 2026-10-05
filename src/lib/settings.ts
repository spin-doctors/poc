import { z } from "zod/v3";

const KEY = "spin-doctors:settings:v1";

const settingsSchema = z.object({
  /** Playtest-only systems (company, staff) that are not part of the core loop yet. */
  experimental: z.boolean().catch(false).default(false),
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
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Settings just won't survive a reload if storage is unavailable.
  }
}
