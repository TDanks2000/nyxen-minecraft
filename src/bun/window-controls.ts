import type { BrowserWindow } from "electrobun/bun";

type WindowState = {
  maximized: boolean;
  minimized: boolean;
};

let mainWindow: BrowserWindow | null = null;

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
    maximized: window.isMaximized(),
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

  if (window.isMaximized()) {
    window.unmaximize();
  } else {
    window.maximize();
  }

  return getWindowState();
};

export const closeWindow = (): null => {
  getMainWindow().close();

  return null;
};
