import { version } from "$app/environment";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsEvent } from "./analytics";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.restoreAllMocks();
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
        type: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        if (type === "load") onLoad = listener as () => void;
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

  it("does not load remote analytics when no endpoint is configured", async () => {
    vi.stubEnv("PUBLIC_GOATCOUNTER_URL", "");
    const append = vi.fn();
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { head: { append } });
    const { initAnalytics, trackAnalyticsEvent } = await import("./analytics");
    trackAnalyticsEvent("campaign-started");
    initAnalytics();
    expect(append).not.toHaveBeenCalled();
  });

  it("drops pending and future events when the remote script fails offline", async () => {
    vi.stubEnv(
      "PUBLIC_GOATCOUNTER_URL",
      "https://example.goatcounter.com/count",
    );
    const listeners: Record<string, () => void> = {};
    const script = {
      dataset: {},
      addEventListener: (type: string, listener: () => void) => {
        listeners[type] = listener;
      },
    };
    const browserWindow: Pick<Window, "goatcounter"> = {};
    vi.stubGlobal("window", browserWindow);
    vi.stubGlobal("document", {
      createElement: () => script,
      head: { append: vi.fn() },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { initAnalytics, trackAnalyticsEvent } = await import("./analytics");
    trackAnalyticsEvent("campaign-started");
    initAnalytics();
    expect(() => listeners.error()).not.toThrow();
    const count = vi.fn();
    browserWindow.goatcounter!.count = count;
    trackAnalyticsEvent("campaign-move-played");
    listeners.load();
    expect(count).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "GoatCounter is unavailable; gameplay continues without analytics.",
    );
  });

  it("reports an unusable script without blocking the game", async () => {
    vi.stubEnv(
      "PUBLIC_GOATCOUNTER_URL",
      "https://example.goatcounter.com/count",
    );
    const listeners: Record<string, () => void> = {};
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      createElement: () => ({
        dataset: {},
        addEventListener: (type: string, listener: () => void) => {
          listeners[type] = listener;
        },
      }),
      head: { append: vi.fn() },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { initAnalytics } = await import("./analytics");
    initAnalytics();
    expect(() => listeners.load()).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});
