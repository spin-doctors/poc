import { version } from "$app/environment";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsEvent } from "./analytics";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("GoatCounter action events", () => {
  it("flushes only fixed event categories after the counter loads", async () => {
    vi.stubEnv(
      "PUBLIC_GOATCOUNTER_URL",
      "https://example.goatcounter.com/count",
    );

    let onLoad: (() => void) | undefined;
    const script = {
      async: false,
      src: "",
      dataset: {} as DOMStringMap,
      addEventListener: (
        _type: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        onLoad = listener as () => void;
      },
    } as HTMLScriptElement;
    const append = vi.fn();
    const browserWindow = {
      location: { pathname: "/" },
    } as unknown as Window;
    vi.stubGlobal("window", browserWindow);
    vi.stubGlobal("document", {
      createElement: vi.fn(() => script),
      head: { append },
    } as unknown as Document);

    vi.resetModules();
    const { initAnalytics, trackAnalyticsEvent } = await import("./analytics");
    const events: AnalyticsEvent[] = [
      "campaign-started",
      "campaign-move-played",
      "campaign-event-answered",
      "campaign-day-advanced",
      "company-incorporated",
      "staff-hired",
      "career-restarted",
      "campaign-kept",
      "campaign-sacked",
    ];
    for (const event of events) trackAnalyticsEvent(event);

    initAnalytics();
    const count = vi.fn();
    browserWindow.goatcounter!.count = count;
    onLoad?.();

    expect(append).toHaveBeenCalledWith(script);
    expect(count.mock.calls).toEqual(
      events.map((event) => [
        { path: event, title: `${event} (${version})`, event: true },
      ]),
    );
  });
});
