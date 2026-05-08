import { describe, expect, test } from "bun:test";
import type { BrowserWindow } from "electrobun/bun";
import {
  closeWindow,
  getWindowState,
  minimizeWindow,
  setMainWindow,
  toggleMaximizeWindow,
} from "../src/bun/window-controls";

const createWindowStub = () => {
  let closed = false;
  let maximized = false;
  let minimized = false;

  const window = {
    close: () => {
      closed = true;
    },
    isMaximized: () => maximized,
    isMinimized: () => minimized,
    maximize: () => {
      maximized = true;
    },
    minimize: () => {
      minimized = true;
    },
    unmaximize: () => {
      maximized = false;
    },
  } as unknown as BrowserWindow;

  return {
    get closed() {
      return closed;
    },
    window,
  };
};

describe("window controls", () => {
  test("dispatches native window actions through the registered main window", () => {
    const stub = createWindowStub();

    setMainWindow(stub.window);

    expect(getWindowState()).toEqual({ maximized: false, minimized: false });
    expect(minimizeWindow()).toEqual({ maximized: false, minimized: true });
    expect(toggleMaximizeWindow()).toEqual({
      maximized: true,
      minimized: true,
    });
    expect(toggleMaximizeWindow()).toEqual({
      maximized: false,
      minimized: true,
    });
    expect(closeWindow()).toBeNull();
    expect(stub.closed).toBe(true);
  });
});
