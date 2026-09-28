export type AnalyticsEvent =
  "campaign-started" | "campaign-kept" | "campaign-sacked";

interface GoatCounter {
  path?: () => string;
  count?: (options: { path: string; title: string; event: true }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

const pendingEvents: AnalyticsEvent[] = [];
const countUrl = import.meta.env.PUBLIC_GOATCOUNTER_URL ?? "";
let initialized = false;

export function trackAnalyticsEvent(event: AnalyticsEvent) {
  if (typeof window === "undefined" || !countUrl) return;

  const counter = window.goatcounter;
  if (initialized && counter?.count) {
    counter.count({ path: event, title: event, event: true });
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
    if (!counter?.count) return;

    for (const event of pendingEvents.splice(0)) {
      counter.count({ path: event, title: event, event: true });
    }
  });
  document.head.append(script);
}
