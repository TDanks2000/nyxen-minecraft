import { BrowserWindow, Utils } from "electrobun/bun";
import { APP_NAME } from "../shared/constants";
import { mainViewRPC } from "./rpc/router";

const isAllowedNavigation = (url: string): boolean =>
  url.startsWith("views://") || url === "about:blank";

type NavigationEvent = {
  data?: {
    detail?: unknown;
    url?: unknown;
  };
  response?: {
    allow: boolean;
  };
};

const isNavigationEvent = (event: unknown): event is NavigationEvent =>
  typeof event === "object" && event !== null;

const getNavigationUrl = (event: unknown): string | null => {
  if (!isNavigationEvent(event)) {
    return null;
  }

  const data = event.data;

  if (!data || typeof data !== "object") {
    return null;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.url === "string") {
    return data.url;
  }

  return null;
};

export const createMainWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    frame: {
      height: 720,
      width: 1080,
      x: 120,
      y: 120,
    },
    styleMask: {
      Closable: true,
      FullSizeContentView: true,
      Miniaturizable: true,
      Resizable: true,
      Titled: true,
    },
    titleBarStyle: "hiddenInset",
    rpc: mainViewRPC,
    title: APP_NAME,
    url: "views://main/index.html",
  });

  window.webview.on("will-navigate", (event: unknown) => {
    const url = getNavigationUrl(event);

    if ((!url || !isAllowedNavigation(url)) && isNavigationEvent(event)) {
      event.response = { allow: false };
    }
  });

  window.on("close", () => {
    Utils.quit();
  });

  return window;
};
