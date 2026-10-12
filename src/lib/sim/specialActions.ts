import type { Content, GameAction } from "../schema/content";
import type { GameState } from "./types";

export const SPECIAL_TRACKS = [
  "credibility",
  "ruthlessness",
  "personalFunds",
] as const;
export const SPECIAL_LABELS = {
  credibility: "Credibility",
  ruthlessness: "Ruthlessness",
  personalFunds: "Personal funds",
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Percentage penalties are based on credibility at commitment, not on rewards. */
export function specialPreview(
  state: GameState,
  content: Content,
  action: GameAction,
) {
  const risk = action.special;
  if (!risk) return null;
  const credibilityCost = round1(
    (state.credibility * risk.credibilityCostPct) / 100,
  );
  const failureCredibilityCost = Math.min(
    Math.max(0, state.credibility - credibilityCost),
    round1((state.credibility * risk.failureCredibilityPct) / 100),
  );
  const dismissalChance =
    risk.dismissalChance > 0
      ? Math.max(
          0.01,
          risk.dismissalChance * content.contract.dismissalRiskMultiplier,
        )
      : 0;
  return {
    ...risk,
    credibilityCost,
    failureCredibilityCost,
    dismissalChance,
    overallDismissalChance: risk.failureChance * dismissalChance,
  };
}

/** Budget is affordability, not progression; array order is writer-authored. */
export function visibleSpecialActions(state: GameState, actions: GameAction[]) {
  const nextLocks = new Set<string>();
  return actions.filter((action) => {
    if (!action.special) return true;
    const locked = action.requires.some((r) => state[r.stat] < r.min);
    if (!locked) return true;
    if (nextLocks.has(action.special.track)) return false;
    nextLocks.add(action.special.track);
    return true;
  });
}
