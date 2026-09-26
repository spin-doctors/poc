import { z } from 'zod';

/**
 * These schemas are the writer-facing contract AND the future LLM output schema.
 * Nothing in the sim engine knows what a "scandal" is — it only applies Effects.
 */

/** `target` resolves to whichever group the player aimed the action at. */
export const effectTargetSchema = z.union([
	z.literal('all'),
	z.literal('target'),
	z.string().min(1)
]);

export const effectSchema = z.object({
	on: effectTargetSchema,
	stat: z.enum(['support', 'turnout', 'morale', 'money']),
	delta: z.number(),
	/** Spin effects are amplified/damped by a group's gullibility. Facts are not. */
	spin: z.boolean().default(false)
});

export const voterGroupSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	blurb: z.string().min(1),
	size: z.number().int().positive(),
	baseSupport: z.number().min(0).max(100),
	baseTurnout: z.number().min(0).max(100),
	gullibility: z.number().min(0).max(100)
});

export const actionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
	flavour: z.string().min(1),
	cost: z.number().min(0),
	/** Targeted actions make the player choose which group to court that day. */
	targeted: z.boolean().default(false),
	effects: z.array(effectSchema).min(1)
});

export const responseSchema = z.object({
	label: z.string().min(1),
	/** Shown on the button. Flavour, never numbers — the outcome stays a gamble. */
	hint: z.string().min(1).optional(),
	flavour: z.string().min(1),
	effects: z.array(effectSchema),
	/** Chains straight into another event instead of ending the day. */
	next: z.string().min(1).optional(),
	/** Lets a low-morale candidate go off-script on this choice. */
	riskGaffe: z.boolean().default(false)
});

export const gameEventSchema = z.object({
	id: z.string().min(1),
	headline: z.string().min(1),
	body: z.string().min(1),
	/** Fires at the end of this day. Omit for events only reached by chaining. */
	day: z.number().int().min(1).optional(),
	responses: z.array(responseSchema).min(2).max(4)
});

export const objectiveSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	stat: z.enum(['voteShare', 'morale']),
	target: z.number()
});

export const contractSchema = z.object({
	id: z.string().min(1),
	candidateName: z.string().min(1),
	candidateBlurb: z.string().min(1),
	seat: z.string().min(1),
	days: z.number().int().positive(),
	budget: z.number().positive(),
	startingMorale: z.number().min(0).max(100),
	objectives: z.array(objectiveSchema).min(1),
	sackMessage: z.string().min(1),
	keepMessage: z.string().min(1),
	/** The sadder job waiting for you if you're sacked. */
	nextJob: z.object({
		candidateName: z.string().min(1),
		seat: z.string().min(1),
		sting: z.string().min(1)
	})
});

export const contentSchema = z.object({
	groups: z.array(voterGroupSchema).min(1),
	actions: z.array(actionSchema).min(1),
	events: z.array(gameEventSchema),
	/** Fired when the candidate's morale collapses and they go off-script. */
	gaffes: z.array(z.string().min(1)),
	contract: contractSchema
});

export type Effect = z.infer<typeof effectSchema>;
export type VoterGroup = z.infer<typeof voterGroupSchema>;
export type GameAction = z.infer<typeof actionSchema>;
export type EventResponse = z.infer<typeof responseSchema>;
export type GameEvent = z.infer<typeof gameEventSchema>;
export type Objective = z.infer<typeof objectiveSchema>;
export type Contract = z.infer<typeof contractSchema>;
export type Content = z.infer<typeof contentSchema>;
