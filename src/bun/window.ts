import { existsSync, watch } from "node:fs";
import { join } from "node:path";
import { BrowserWindow, Screen, Utils } from "electrobun/bun";
import { APP_NAME } from "../shared/constants";
import { mainViewRPC } from "./rpc/router";
import { setMainWindow } from "./window-controls";

const WINDOW_PADDING = 48;
const MAX_WINDOW_WIDTH = 1280;
const MAX_WINDOW_HEIGHT = 860;
const MIN_WINDOW_WIDTH = 960;
const MIN_WINDOW_HEIGHT = 640;
const MAIN_VIEW_URL = "views://main/index.html";
const DEV_VIEW_DIRECTORY = join(process.cwd(), ".electrobun", "views", "main");
const DEV_RELOAD_DELAY_MS = 120;
const LOCAL_NAVIGATION_RULES = ["^*", "views://*", "about:blank"];

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

const setupDevViewReloader = (window: BrowserWindow): void => {
  if (process.env.CES_DEV_RELOAD !== "1" || !existsSync(DEV_VIEW_DIRECTORY)) {
    return;
  }

  let reloadTimer: ReturnType<typeof setTimeout> | null = null;
  const watcher = watch(DEV_VIEW_DIRECTORY, { persistent: false }, () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      window.webview.loadURL(MAIN_VIEW_URL);
    }, DEV_RELOAD_DELAY_MS);
  });

  window.on("close", () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    watcher.close();
  });
};

export const createMainWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    frame: getResponsiveWindowFrame(),
    titleBarStyle: "hidden",
    rpc: mainViewRPC,
    title: APP_NAME,
    url: MAIN_VIEW_URL,
  });

  window.webview.setNavigationRules(LOCAL_NAVIGATION_RULES);
  setupDevViewReloader(window);

  window.on("close", () => {
    Utils.quit();
  });

  setMainWindow(window);

  return window;
};
