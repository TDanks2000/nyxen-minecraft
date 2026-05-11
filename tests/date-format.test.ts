import { describe, expect, test } from "bun:test";
import { formatInstanceLastPlayed } from "../src/views/main/features/instances/components/instance-format";
import {
  formatClockTime,
  formatRelativeTime,
} from "../src/views/main/lib/date-format";

describe("renderer date formatters", () => {
  test("keeps missing and invalid instance launch dates from crashing cards", () => {
    expect(formatInstanceLastPlayed(null)).toBe("Never played");
    expect(formatInstanceLastPlayed("not-a-date")).toBe("Unknown date");
    expect(formatInstanceLastPlayed("not-a-date", { prefix: true })).toBe(
      "Played Unknown date",
    );
  });

  test("returns fallback labels for invalid generic dates", () => {
    expect(formatRelativeTime("not-a-date")).toBe("Unknown date");
    expect(formatClockTime("not-a-date")).toBe("Unknown time");
  });
});
