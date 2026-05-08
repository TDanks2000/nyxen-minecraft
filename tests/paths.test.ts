import { describe, expect, test } from "bun:test";
import { join } from "node:path";
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
});
