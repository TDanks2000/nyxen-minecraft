import { describe, expect, test } from "bun:test";
import type { BrowserWindow } from "electrobun/bun";
import {
  closeWindow,
  getWindowState,
  hideWindow,
  minimizeWindow,
  setMainWindow,
  showWindow,
  toggleMaximizeWindow,
} from "../src/bun/window-controls";

type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const createWindowStub = () => {
  let closed = false;
  let hidden = false;
  let maximized = false;
  let minimized = false;
  let frame: Frame = {
    x: 100,
    y: 100,
    width: 1280,
    height: 720,
  };

  const window = {
    close: () => {
      closed = true;
    },
    getFrame: () => frame,
    hide: () => {
      hidden = true;
    },
    isMaximized: () => maximized,
    isMinimized: () => minimized,
    maximize: () => {
      maximized = true;
    },
    minimize: () => {
      minimized = true;
    },
    setFrame: (x: number, y: number, width: number, height: number) => {
      frame = {
        x,
        y,
        width,
        height,
      };
    },
    show: () => {
      hidden = false;
    },
    unmaximize: () => {
      maximized = false;
    },
  } as unknown as BrowserWindow;

  return {
    get closed() {
      return closed;
    },
    get frame() {
      return frame;
    },
    get hidden() {
      return hidden;
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

    expect(hideWindow()).toBeNull();
    expect(stub.hidden).toBe(true);

    expect(showWindow()).toEqual({
      maximized: false,
      minimized: true,
    });
    expect(stub.hidden).toBe(false);

    expect(closeWindow()).toBeNull();
    expect(stub.closed).toBe(true);
  });
});
