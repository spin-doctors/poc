import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  platform: "android",
  addListener: vi.fn(),
  exitApp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => native.platform },
}));
vi.mock("@capacitor/app", () => ({
  App: { addListener: native.addListener, exitApp: native.exitApp },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.resetModules();
  native.platform = "android";
});

async function setup() {
  let back: ((event: { canGoBack: boolean }) => void) | undefined;
  const remove = vi.fn();
  native.addListener.mockImplementation(
    (_event: string, handler: typeof back) => {
      back = handler;
      return Promise.resolve({ remove });
    },
  );
  const historyBack = vi.fn();
  vi.stubGlobal("window", { history: { back: historyBack } });
  const navigation = await import("./androidNavigation");
  const listener = await navigation.initAndroidNavigation();
  return { ...navigation, listener, back: back!, remove, historyBack };
}

describe("Android Back navigation", () => {
  it("does not register native listeners on web or iOS", async () => {
    const navigation = await import("./androidNavigation");
    for (const platform of ["web", "ios"]) {
      native.platform = platform;
      expect(await navigation.initAndroidNavigation()).toBeUndefined();
    }
    expect(native.addListener).not.toHaveBeenCalled();
  });

  it("lets a game subview return to the dashboard before leaving the app", async () => {
    const navigation = await setup();
    const gameBack = vi.fn(() => true);
    const clear = navigation.setGameBackHandler(gameBack);
    navigation.back({ canGoBack: true });
    expect(gameBack).toHaveBeenCalledOnce();
    expect(navigation.historyBack).not.toHaveBeenCalled();
    expect(native.exitApp).not.toHaveBeenCalled();
    clear();
    navigation.back({ canGoBack: true });
    expect(navigation.historyBack).toHaveBeenCalledOnce();
  });

  it("uses WebView history for routes and exits only at the root", async () => {
    const navigation = await setup();
    navigation.back({ canGoBack: true });
    expect(navigation.historyBack).toHaveBeenCalledOnce();
    expect(native.exitApp).not.toHaveBeenCalled();
    navigation.back({ canGoBack: false });
    expect(native.exitApp).toHaveBeenCalledOnce();
    await navigation.listener?.remove();
    expect(navigation.remove).toHaveBeenCalledOnce();
  });

  it("reports a native exit failure", async () => {
    const error = new Error("native failure");
    native.exitApp.mockRejectedValueOnce(error);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const navigation = await setup();
    navigation.back({ canGoBack: false });
    await Promise.resolve();
    expect(log).toHaveBeenCalledWith("Could not close the Android app.", error);
    log.mockRestore();
  });
});
