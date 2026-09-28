import actions from "../../../content/actions.json";
import gaffes from "../../../content/gaffes.json";
import ashcombeContract from "../../../content/scenarios/council-ashcombe/contract.json";
import ashcombeEvents from "../../../content/scenarios/council-ashcombe/events.json";
import ashcombeGroups from "../../../content/scenarios/council-ashcombe/voter-groups.json";
import pendleContract from "../../../content/scenarios/council-pendle/contract.json";
import pendleEvents from "../../../content/scenarios/council-pendle/events.json";
import pendleGroups from "../../../content/scenarios/council-pendle/voter-groups.json";
import harwellContract from "../../../content/scenarios/parliamentary-harwell/contract.json";
import harwellEvents from "../../../content/scenarios/parliamentary-harwell/events.json";
import harwellGroups from "../../../content/scenarios/parliamentary-harwell/voter-groups.json";
import {
  actionSchema,
  contentSchema,
  scenarioSchema,
  type Content,
} from "../schema/content";

const bundles = [
  {
    contract: ashcombeContract,
    groups: ashcombeGroups,
    events: ashcombeEvents,
  },
  { contract: pendleContract, groups: pendleGroups, events: pendleEvents },
  { contract: harwellContract, groups: harwellGroups, events: harwellEvents },
];

const sharedActions = actionSchema.array().parse(actions);

function resolve(bundle: unknown): Content {
  const scenario = scenarioSchema.parse(bundle);
  const ids = new Set(sharedActions.map((a) => a.id));
  for (const action of scenario.actions) {
    if (ids.has(action.id))
      throw new Error(
        `${scenario.contract.id} redefines shared action ${action.id}`,
      );
  }
  return contentSchema.parse({
    groups: scenario.groups,
    actions: [...sharedActions, ...scenario.actions],
    events: scenario.events,
    gaffes,
    contract: scenario.contract,
  });
}

/** Throws loudly at startup if a writer's JSON is malformed. */
export const scenarios: Record<string, Content> = Object.fromEntries(
  bundles.map((bundle) => {
    const resolved = resolve(bundle);
    return [resolved.contract.id, resolved];
  }),
);

for (const scenario of Object.values(scenarios)) {
  if (!scenarios[scenario.contract.fallback])
    throw new Error(
      `${scenario.contract.id} falls back to unknown scenario ${scenario.contract.fallback}`,
    );
}

/** Where every career starts, and what old share links replay. */
export const defaultScenarioId = "council-ashcombe";

export const content: Content = scenarios[defaultScenarioId];
