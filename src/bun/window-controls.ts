import { Screen } from "electrobun/bun";
import type { BrowserWindow } from "electrobun/bun";

type WindowState = {
  maximized: boolean;
  minimized: boolean;
};

let mainWindow: BrowserWindow | null = null;
// On Windows, window.maximize() goes fullscreen — we simulate it manually.
let windowsMaximized = false;
let savedFrame: { x: number; y: number; width: number; height: number } | null =
  null;
const isWindows = process.platform === "win32";

const getMainWindow = (): BrowserWindow => {
  if (!mainWindow) {
    throw new Error("Main window is not ready.");
  }

  return mainWindow;
};

export const setMainWindow = (window: BrowserWindow): void => {
  mainWindow = window;
};

export const getWindowState = (): WindowState => {
  const window = getMainWindow();

  return {
    maximized: isWindows ? windowsMaximized : window.isMaximized(),
    minimized: window.isMinimized(),
  };
};

export const minimizeWindow = (): WindowState => {
  const window = getMainWindow();

  window.minimize();

  return getWindowState();
};

export const toggleMaximizeWindow = (): WindowState => {
  const window = getMainWindow();

  if (isWindows) {
    if (windowsMaximized) {
      if (savedFrame) {
        window.setFrame(
          savedFrame.x,
          savedFrame.y,
          savedFrame.width,
          savedFrame.height,
        );
      }
      windowsMaximized = false;
    } else {
      savedFrame = window.getFrame();
      const { workArea } = Screen.getPrimaryDisplay();
      window.setFrame(workArea.x, workArea.y, workArea.width, workArea.height);
      windowsMaximized = true;
    }
    return getWindowState();
  }

  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }

  return getWindowState();
};

export const getWindowFrame = (): {
  x: number;
  y: number;
  width: number;
  height: number;
} => getMainWindow().getFrame();

export const setWindowFrame = (frame: {
  x: number;
  y: number;
  width: number;
  height: number;
}): null => {
  getMainWindow().setFrame(frame.x, frame.y, frame.width, frame.height);
  return null;
};

export const closeWindow = (): null => {
  getMainWindow().close();

  return null;
};
