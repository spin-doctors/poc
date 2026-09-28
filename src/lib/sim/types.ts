import type { Content, Effect } from "../schema/content";

export interface GameState {
  seed: number;
  rngState: number;
  /** Your own stats on day one; carried in from a career, so replays need them too. */
  start: StartingStats;
  day: number;
  money: number;
  morale: number;
  /** Your own standing as an operator, which gates what you get offered. */
  credibility: number;
  ruthlessness: number;
  personalFunds: number;
  /** Shaves the published poll's margin of error. Inside information. */
  pollAccuracy: number;
  /** Current support percentage per group id. */
  support: Record<string, number>;
  /** Additive turnout modifier per group id. */
  turnout: Record<string, number>;
  pollReport: PollReport | null;
  positions: Record<string, string>;
  pendingEventId: string | null;
  /** A `nextDay` follow-up waiting for the day to end. */
  queuedEventId: string | null;
  /** Today's move is done; the campaign waits for the day to end. */
  turnTaken: boolean;
  history: PlayerMove[];
  finished: boolean;
}

export interface StartingStats {
  credibility: number;
  ruthlessness: number;
  personalFunds: number;
}

export type PlayerMove =
  | { kind: "action"; actionId: string; target?: string }
  | { kind: "respond"; eventId: string; responseIndex: number };

/** What the player is told immediately. Relationships are certain; turnout is not. */
export interface FeedbackLine {
  groupId: string | null;
  label: string;
  stat: Effect["stat"];
  delta: number;
  certain: boolean;
}

export interface MoveResult {
  state: GameState;
  flavour: string;
  feedback: FeedbackLine[];
  gaffe: GaffeReport | null;
  triggeredEventId: string | null;
  pollCommissioned: boolean;
}

export interface PollReport {
  availableOnDay: number;
  margin: number;
}

export interface PollForecast {
  share: number;
  margin: number;
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
