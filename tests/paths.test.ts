import { describe, expect, test } from "bun:test";
import { join, posix, win32 } from "node:path";
import { APP_CHANNEL, APP_IDENTIFIER } from "../src/shared/constants";

describe("launcher paths", () => {
  test("uses a stable app data directory by default", async () => {
    const originalDataDir = process.env.NYXEN_DATA_DIR;
    delete process.env.NYXEN_DATA_DIR;

    try {
      const { getDataRoot } = await import("../src/bun/launcher/paths");
      const root = getDataRoot();

      expect(root).toContain(APP_IDENTIFIER);
      expect(root).toContain(APP_CHANNEL);
      expect(root).not.toBe(join(process.cwd(), "data"));
    } finally {
      if (originalDataDir === undefined) {
        delete process.env.NYXEN_DATA_DIR;
      } else {
        process.env.NYXEN_DATA_DIR = originalDataDir;
      }
    }
  });

  test("allows NYXEN_DATA_DIR to override the default", async () => {
    const originalDataDir = process.env.NYXEN_DATA_DIR;
    process.env.NYXEN_DATA_DIR = "/tmp/nyxen-test-data";

    try {
      const { getDataRoot } = await import("../src/bun/launcher/paths");

      expect(getDataRoot()).toBe("/tmp/nyxen-test-data");
    } finally {
      if (originalDataDir === undefined) {
        delete process.env.NYXEN_DATA_DIR;
      } else {
        process.env.NYXEN_DATA_DIR = originalDataDir;
      }
    }
  });

  test("builds native app data roots for Windows, macOS, and Linux", async () => {
    const { getDefaultDataRoot } = await import("../src/bun/launcher/paths");

    expect(
      getDefaultDataRoot({
        env: {},
        home: "C:\\Users\\Alex",
        platform: "win32",
      }),
    ).toBe(
      win32.join(
        "C:\\Users\\Alex",
        "AppData",
        "Local",
        APP_IDENTIFIER,
        APP_CHANNEL,
      ),
    );
    expect(
      getDefaultDataRoot({
        env: { LOCALAPPDATA: "D:\\LauncherData" },
        home: "C:\\Users\\Alex",
        platform: "win32",
      }),
    ).toBe(win32.join("D:\\LauncherData", APP_IDENTIFIER, APP_CHANNEL));
    expect(
      getDefaultDataRoot({
        env: {},
        home: "/Users/alex",
        platform: "darwin",
      }),
    ).toBe(
      posix.join(
        "/Users/alex",
        "Library",
        "Application Support",
        APP_IDENTIFIER,
        APP_CHANNEL,
      ),
    );
    expect(
      getDefaultDataRoot({
        env: { XDG_DATA_HOME: "/var/lib/nyxen-test" },
        home: "/home/alex",
        platform: "linux",
      }),
    ).toBe(posix.join("/var/lib/nyxen-test", APP_IDENTIFIER, APP_CHANNEL));
    expect(
      getDefaultDataRoot({
        env: {},
        home: "/home/alex",
        platform: "linux",
      }),
    ).toBe(
      posix.join("/home/alex", ".local", "share", APP_IDENTIFIER, APP_CHANNEL),
    );
  });
});
