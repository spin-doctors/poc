import type { FeedbackLine } from "$lib/sim/types";

const gbp = new Intl.NumberFormat("en-GB");

export const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
export const pounds = (n: number) => `£${gbp.format(n)}`;

export function formatDelta(line: FeedbackLine) {
  if (line.stat === "money" || line.stat === "personalFunds") {
    return `${line.delta > 0 ? "+" : "−"}£${gbp.format(Math.abs(line.delta))}`;
  }
  const suffix = line.stat === "support" || line.stat === "turnout" ? "%" : "";
  return `${sign(line.delta)}${suffix}`;
}
