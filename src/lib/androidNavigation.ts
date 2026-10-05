import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

let gameBackHandler: (() => boolean) | undefined;

export function setGameBackHandler(handler: () => boolean) {
  gameBackHandler = handler;
  return () => {
    if (gameBackHandler === handler) gameBackHandler = undefined;
  };
}

export async function initAndroidNavigation() {
  if (Capacitor.getPlatform() !== "android") return;

  return App.addListener("backButton", ({ canGoBack }) => {
    if (gameBackHandler?.()) return;
    if (canGoBack) {
      window.history.back();
    } else {
      void App.exitApp().catch((error: unknown) => {
        console.error("Could not close the Android app.", error);
      });
    }
  });
}
