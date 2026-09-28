import actions from "../../../content/actions.json";
import contract from "../../../content/contract.json";
import events from "../../../content/events.json";
import gaffes from "../../../content/gaffes.json";
import groups from "../../../content/voter-groups.json";
import { contentSchema, type Content } from "../schema/content";

/** Throws loudly at startup if a writer's JSON is malformed. */
export const content: Content = contentSchema.parse({
  groups,
  actions,
  events,
  gaffes,
  contract,
});
