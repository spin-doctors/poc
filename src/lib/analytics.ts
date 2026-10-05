export type AnalyticsEvent =
  | "campaign-started"
  | "campaign-move-played"
  | "campaign-event-answered"
  | "campaign-day-advanced"
  | "company-incorporated"
  | "staff-hired"
  | "career-restarted"
  | "campaign-kept"
  | "campaign-sacked";

interface GoatCounter {
  path?: () => string;
  count?: (options: { path: string; title: string; event: true }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

import { version } from "$app/environment";

const pendingEvents: AnalyticsEvent[] = [];
const countUrl = import.meta.env.PUBLIC_GOATCOUNTER_URL ?? "";
let initialized = false;
let unavailable = false;

function send(counter: GoatCounter, event: AnalyticsEvent) {
  // The path stays stable so counts aggregate across builds.
  counter.count?.({ path: event, title: `${event} (${version})`, event: true });
}

export function trackAnalyticsEvent(event: AnalyticsEvent) {
  if (typeof window === "undefined" || !countUrl || unavailable) return;

  const counter = window.goatcounter;
  if (initialized && counter?.count) {
    send(counter, event);
    return;
  }

  pendingEvents.push(event);
}

export function initAnalytics() {
  if (typeof window === "undefined" || !countUrl || initialized) return;
  initialized = true;

  window.goatcounter = {
    path: () => window.location.pathname,
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.dataset.goatcounter = countUrl;
  script.addEventListener("load", () => {
    const counter = window.goatcounter;
    if (!counter?.count) {
      markUnavailable();
      return;
    }

    for (const event of pendingEvents.splice(0)) {
      send(counter, event);
    }
  });
  script.addEventListener("error", markUnavailable);
  document.head.append(script);
}

function markUnavailable() {
  unavailable = true;
  pendingEvents.length = 0;
  console.warn(
    "GoatCounter is unavailable; gameplay continues without analytics.",
  );
}
