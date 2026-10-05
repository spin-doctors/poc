import { z } from "zod/v3";

/**
 * These schemas are the writer-facing contract AND the future LLM output schema.
 * Nothing in the sim engine knows what a "scandal" is — it only applies Effects.
 */

/** `target` resolves to whichever group the player aimed the action at. */
export const effectTargetSchema = z.union([
  z.literal("all"),
  z.literal("target"),
  z.string().min(1),
]);

export const effectSchema = z.object({
  on: effectTargetSchema,
  stat: z.enum([
    "support",
    "turnout",
    "morale",
    "money",
    "credibility",
    "ruthlessness",
    "personalFunds",
    "pollAccuracy",
  ]),
  delta: z.number(),
  /** Spin effects are amplified/damped by a group's gullibility. Facts are not. */
  spin: z.boolean().default(false),
});

export const voterGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  blurb: z.string().min(1),
  size: z.number().int().positive(),
  baseSupport: z.number().min(0).max(100),
  baseTurnout: z.number().min(0).max(100),
  gullibility: z.number().min(0).max(100),
});

/** Locked actions stay visible from day one so they can shape the week's plan. */
export const requirementSchema = z.object({
  stat: z.enum(["credibility", "ruthlessness", "personalFunds"]),
  min: z.number(),
  label: z.string().min(1),
});

export const actionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  flavour: z.string().min(1),
  cost: z.number().min(0),
  /** Targeted actions make the player choose which group to court that day. */
  targeted: z.boolean().default(false),
  requires: z.array(requirementSchema).default([]),
  /** A commissioned poll's confidence margin; commissioning does not move voters. */
  pollMargin: z.number().positive().max(10).optional(),
  effects: z.array(effectSchema),
});

export const responseSchema = z
  .object({
    label: z.string().min(1),
    /** Shown on the button. Flavour, never numbers — the outcome stays a gamble. */
    hint: z.string().min(1).optional(),
    flavour: z.string().min(1),
    effects: z.array(effectSchema),
    /** Chains straight into another event instead of ending the day. */
    next: z.string().min(1).optional(),
    /** Queues a follow-up for the next campaign day. */
    nextDay: z.string().min(1).optional(),
    /** Records the candidate's public position on an issue. */
    positionChange: z
      .object({ issue: z.string().min(1), position: z.string().min(1) })
      .optional(),
    /** Lets a low-morale candidate go off-script on this choice. */
    riskGaffe: z.boolean().default(false),
  })
  .refine((response) => !(response.next && response.nextDay), {
    message: "A response may chain now or next day, but not both",
  });

export const gameEventSchema = z.object({
  id: z.string().min(1),
  headline: z.string().min(1),
  body: z.string().min(1),
  /** Fires at the end of this day. Omit for events only reached by chaining. */
  day: z.number().int().min(1).optional(),
  /** Presentation treatment for narrative events; never disables the real UI. */
  presentation: z.enum(["normal", "corrupted-feed"]).default("normal"),
  responses: z.array(responseSchema).min(1).max(4),
});

export const objectiveSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  stat: z.enum(["voteShare", "morale"]),
  target: z.number(),
});

/** Who will hire you between campaigns. Read against career stats, not campaign state. */
export const careerRequirementSchema = z
  .object({
    stat: z.enum(["recognition", "credibility", "ruthlessness"]),
    min: z.number().optional(),
    max: z.number().optional(),
    label: z.string().min(1),
  })
  .refine((r) => r.min !== undefined || r.max !== undefined, {
    message: "A career requirement needs a min or a max",
  });

export const contractAppealSchema = z.object({
  stat: z.enum(["credibility", "ruthlessness"]),
  weight: z.number(),
});

export const contractSchema = z.object({
  /** Doubles as the scenario id. */
  id: z.string().min(1),
  tier: z.enum(["council", "parliamentary"]),
  /** Shown under the seat name, e.g. "by-election". */
  election: z.string().min(1),
  /** One line on the offer card between campaigns. */
  pitch: z.string().min(1),
  candidateName: z.string().min(1),
  candidateBlurb: z.string().min(1),
  seat: z.string().min(1),
  days: z.number().int().positive(),
  budget: z.number().positive(),
  startingMorale: z.number().min(0).max(100),
  /** The spin doctor's own standing, not the candidate's. */
  startingCredibility: z.number().min(0).max(100),
  startingRuthlessness: z.number().min(0).max(100),
  /** Your own money. Spending it on the campaign is legally grey. */
  personalFunds: z.number().min(0),
  objectives: z.array(objectiveSchema).min(1),
  sackMessage: z.string().min(1),
  keepMessage: z.string().min(1),
  /** Paid into your personal funds if you keep the account. */
  fee: z.number().min(0),
  /** Base recognition change; keeping the account also earns the margin over target. */
  recognition: z.object({ kept: z.number(), sacked: z.number() }),
  requires: z.array(careerRequirementSchema).default([]),
  /**
   * The kind of operator this client is drawn to. When several clients at the same tier would
   * hire you, your stats times these weights decide who calls: a ruthless record attracts clients
   * weighting ruthlessness, a clean one those weighting credibility.
   */
  appeal: z.array(contractAppealSchema).default([]),
  /** The sadder job waiting for you if you're sacked. Without one, the sack ends your career. */
  fallback: z.string().min(1).optional(),
});

/** Where washed-up spin doctors end up; one is picked when a career ends. */
export const epiloguesSchema = z.array(z.string().min(1)).min(1);

/** A writer's per-campaign bundle; shared actions and gaffes are merged in at load. */
export const scenarioSchema = z.object({
  contract: contractSchema,
  groups: z.array(voterGroupSchema).min(1),
  events: z.array(gameEventSchema),
  actions: z.array(actionSchema).default([]),
});

export const contentSchema = z.object({
  groups: z.array(voterGroupSchema).min(1),
  actions: z.array(actionSchema).min(1),
  events: z.array(gameEventSchema),
  /** Fired when the candidate's morale collapses and they go off-script. */
  gaffes: z.array(z.string().min(1)),
  contract: contractSchema,
});

export type Effect = z.infer<typeof effectSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type VoterGroup = z.infer<typeof voterGroupSchema>;
export type GameAction = z.infer<typeof actionSchema>;
export type EventResponse = z.infer<typeof responseSchema>;
export type GameEvent = z.infer<typeof gameEventSchema>;
export type Objective = z.infer<typeof objectiveSchema>;
export type Contract = z.infer<typeof contractSchema>;
export type CareerRequirement = z.infer<typeof careerRequirementSchema>;
export type Content = z.infer<typeof contentSchema>;
