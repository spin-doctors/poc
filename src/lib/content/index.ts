import actions from "../../../content/actions.json";
import epilogueLines from "../../../content/epilogues.json";
import gaffes from "../../../content/gaffes.json";
import ashcombeContract from "../../../content/scenarios/council-ashcombe/contract.json";
import ashcombeEvents from "../../../content/scenarios/council-ashcombe/events.json";
import ashcombeRivals from "../../../content/scenarios/council-ashcombe/rivals.json";
import ashcombeGroups from "../../../content/scenarios/council-ashcombe/voter-groups.json";
import pendleContract from "../../../content/scenarios/council-pendle/contract.json";
import pendleEvents from "../../../content/scenarios/council-pendle/events.json";
import pendleRivals from "../../../content/scenarios/council-pendle/rivals.json";
import pendleGroups from "../../../content/scenarios/council-pendle/voter-groups.json";
import blackmereContract from "../../../content/scenarios/parliamentary-blackmere/contract.json";
import blackmereEvents from "../../../content/scenarios/parliamentary-blackmere/events.json";
import blackmereRivals from "../../../content/scenarios/parliamentary-blackmere/rivals.json";
import blackmereGroups from "../../../content/scenarios/parliamentary-blackmere/voter-groups.json";
import gravesendContract from "../../../content/scenarios/parliamentary-gravesend/contract.json";
import gravesendEvents from "../../../content/scenarios/parliamentary-gravesend/events.json";
import gravesendRivals from "../../../content/scenarios/parliamentary-gravesend/rivals.json";
import gravesendGroups from "../../../content/scenarios/parliamentary-gravesend/voter-groups.json";
import harwellContract from "../../../content/scenarios/parliamentary-harwell/contract.json";
import harwellEvents from "../../../content/scenarios/parliamentary-harwell/events.json";
import harwellRivals from "../../../content/scenarios/parliamentary-harwell/rivals.json";
import harwellGroups from "../../../content/scenarios/parliamentary-harwell/voter-groups.json";
import {
  actionSchema,
  contentSchema,
  epiloguesSchema,
  scenarioSchema,
  type Content,
} from "../schema/content";

const bundles = [
  {
    contract: ashcombeContract,
    groups: ashcombeGroups,
    events: ashcombeEvents,
    rivals: ashcombeRivals,
  },
  {
    contract: pendleContract,
    groups: pendleGroups,
    events: pendleEvents,
    rivals: pendleRivals,
  },
  {
    contract: harwellContract,
    groups: harwellGroups,
    events: harwellEvents,
    rivals: harwellRivals,
  },
  {
    contract: gravesendContract,
    groups: gravesendGroups,
    events: gravesendEvents,
    rivals: gravesendRivals,
  },
  {
    contract: blackmereContract,
    groups: blackmereGroups,
    events: blackmereEvents,
    rivals: blackmereRivals,
  },
];

const sharedActions = actionSchema.array().parse(actions);

function resolve(bundle: unknown): Content {
  const scenario = scenarioSchema.parse(bundle);
  const rivalIds = scenario.rivals.map((r) => r.id);
  if (rivalIds.includes("client") || new Set(rivalIds).size !== rivalIds.length)
    throw new Error(`${scenario.contract.id}: duplicate or reserved rival id`);
  if (scenario.rivals.filter((r) => !r.novelty).length !== 2)
    throw new Error(`${scenario.contract.id}: needs two main rivals`);
  for (const rival of scenario.rivals) {
    if (
      Object.keys(rival.support).length !== scenario.groups.length ||
      scenario.groups.some((g) => rival.support[g.id] === undefined)
    )
      throw new Error(`${rival.id}: incomplete group support`);
    if (
      rival.novelty &&
      (scenario.contract.tier !== "parliamentary" ||
        Object.values(rival.support).some((share) => share > 2))
    )
      throw new Error(`${rival.id}: invalid novelty support`);
  }
  for (const group of scenario.groups) {
    const total =
      group.baseSupport +
      scenario.rivals.reduce((sum, r) => sum + r.support[group.id], 0);
    if (Math.abs(total - 100) > 0.00001)
      throw new Error(
        `${scenario.contract.id}: ${group.id} support must total 100`,
      );
  }
  const ids = new Set(sharedActions.map((a) => a.id));
  for (const action of scenario.actions) {
    if (ids.has(action.id))
      throw new Error(
        `${scenario.contract.id} redefines shared action ${action.id}`,
      );
  }
  return contentSchema.parse({
    groups: scenario.groups,
    rivals: scenario.rivals,
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

for (const { contract } of Object.values(scenarios)) {
  if (contract.fallback !== undefined && !scenarios[contract.fallback])
    throw new Error(
      `${contract.id} falls back to unknown scenario ${contract.fallback}`,
    );
}

export const epilogues: string[] = epiloguesSchema.parse(epilogueLines);

/** Where every career starts, and what old share links replay. */
export const defaultScenarioId = "council-ashcombe";

export const content: Content = scenarios[defaultScenarioId];
