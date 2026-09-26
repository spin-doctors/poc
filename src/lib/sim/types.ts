import type { Content } from '../schema/content';

export interface GameState {
	seed: number;
	rngState: number;
	day: number;
	money: number;
	morale: number;
	/** Current support percentage per group id. */
	support: Record<string, number>;
	/** Additive turnout modifier per group id. */
	turnout: Record<string, number>;
	pendingEventId: string | null;
	history: PlayerMove[];
	finished: boolean;
}

export type PlayerMove =
	| { kind: 'action'; actionId: string; target?: string }
	| { kind: 'respond'; eventId: string; responseIndex: number };

/** What the player is told immediately. Relationships are certain; turnout is not. */
export interface FeedbackLine {
	groupId: string | null;
	label: string;
	stat: 'support' | 'turnout' | 'morale' | 'money';
	delta: number;
	certain: boolean;
}

export interface MoveResult {
	state: GameState;
	flavour: string;
	feedback: FeedbackLine[];
	gaffe: GaffeReport | null;
	triggeredEventId: string | null;
}

export interface GaffeReport {
	headline: string;
	feedback: FeedbackLine[];
}

export interface GroupResult {
	groupId: string;
	name: string;
	support: number;
	turnoutPct: number;
	votesCast: number;
	votesForUs: number;
}

export interface ElectionResult {
	groups: GroupResult[];
	totalVotes: number;
	ourVotes: number;
	voteShare: number;
	morale: number;
	objectives: ObjectiveResult[];
	sacked: boolean;
}

export interface ObjectiveResult {
	id: string;
	label: string;
	target: number;
	actual: number;
	met: boolean;
}

export type { Content };
