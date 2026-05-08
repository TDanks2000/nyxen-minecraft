import { BrowserWindow, Screen, Utils } from "electrobun/bun";
import { APP_NAME } from "../shared/constants";
import { mainViewRPC } from "./rpc/router";
import { setMainWindow } from "./window-controls";

const WINDOW_PADDING = 48;
const MAX_WINDOW_WIDTH = 1280;
const MAX_WINDOW_HEIGHT = 860;
const MIN_WINDOW_WIDTH = 960;
const MIN_WINDOW_HEIGHT = 640;

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

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getResponsiveWindowFrame = () => {
  const display = Screen.getPrimaryDisplay();
  const { workArea } = display;

  const availableWidth = Math.max(320, workArea.width - WINDOW_PADDING * 2);
  const availableHeight = Math.max(320, workArea.height - WINDOW_PADDING * 2);

  const maxWidth = Math.min(MAX_WINDOW_WIDTH, availableWidth);
  const maxHeight = Math.min(MAX_WINDOW_HEIGHT, availableHeight);

  const minWidth = Math.min(MIN_WINDOW_WIDTH, availableWidth);
  const minHeight = Math.min(MIN_WINDOW_HEIGHT, availableHeight);

  const width = clamp(Math.round(workArea.width * 0.82), minWidth, maxWidth);

  const height = clamp(
    Math.round(workArea.height * 0.82),
    minHeight,
    maxHeight,
  );

  return {
    height,
    width,
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + Math.round((workArea.height - height) / 2),
  };
};

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
    frame: getResponsiveWindowFrame(),
    styleMask: {
      Closable: true,
      FullSizeContentView: true,
      Miniaturizable: true,
      Resizable: true,
      Titled: true,
    },
    titleBarStyle: "hidden",
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

  setMainWindow(window);

  return window;
};
