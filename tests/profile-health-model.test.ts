import { describe, expect, test } from "bun:test";
import type { LauncherProfile } from "../src/shared/types";
import {
  getProfileHealthSummary,
  hasMinecraftOwnership,
} from "../src/views/main/features/profiles/profile-health-model";

const now = new Date("2026-05-12T12:00:00.000Z");

const createProfile = (
  overrides: Partial<LauncherProfile> = {},
): LauncherProfile => ({
  accountId: "11111111-2222-3333-4444-555555555555",
  authExpiresAt: "2026-05-12T13:00:00.000Z",
  authRefreshable: true,
  createdAt: "2026-05-10T12:00:00.000Z",
  displayName: "TestPlayer",
  entitlements: ["game_minecraft", "product_minecraft"],
  id: "profile-test",
  kind: "microsoft",
  ownershipCheckedAt: "2026-05-12T11:00:00.000Z",
  skinUrl: null,
  updatedAt: "2026-05-12T11:00:00.000Z",
  ...overrides,
});

const getItem = (
  profile: LauncherProfile,
  id: ReturnType<typeof getProfileHealthSummary>["items"][number]["id"],
) => {
  const item = getProfileHealthSummary(profile, now).items.find(
    (entry) => entry.id === id,
  );

  if (!item) {
    throw new Error(`Missing profile health item: ${id}`);
  }

  return item;
};

describe("profile health model", () => {
  test("marks verified Microsoft profiles with valid tokens launch ready", () => {
    const profile = createProfile();
    const summary = getProfileHealthSummary(profile, now);

    expect(hasMinecraftOwnership(profile)).toBe(true);
    expect(summary).toMatchObject({
      launchable: true,
      statusLabel: "Launch ready",
      statusTone: "default",
    });
    expect(getItem(profile, "microsoft")).toMatchObject({
      tone: "ready",
      value: "Linked",
    });
    expect(getItem(profile, "xbox")).toMatchObject({
      tone: "ready",
      value: "Verified",
    });
    expect(getItem(profile, "minecraftToken")).toMatchObject({
      tone: "ready",
      value: "Valid",
    });
    expect(getItem(profile, "refresh")).toMatchObject({
      tone: "ready",
      value: "Ready",
    });
  });

  test("allows verified profiles with expired tokens when refresh is available", () => {
    const profile = createProfile({
      authExpiresAt: "2026-05-12T11:59:00.000Z",
      authRefreshable: true,
    });
    const summary = getProfileHealthSummary(profile, now);

    expect(summary).toMatchObject({
      launchable: true,
      statusLabel: "Refresh on launch",
      statusTone: "outline",
    });
    expect(getItem(profile, "minecraftToken")).toMatchObject({
      tone: "warning",
      value: "Refresh needed",
    });
    expect(getItem(profile, "refresh")).toMatchObject({
      detail: "Used before launch",
      tone: "ready",
      value: "Ready on launch",
    });
  });

  test("blocks verified profiles with expired tokens and no refresh credential", () => {
    const profile = createProfile({
      authExpiresAt: "2026-05-12T11:59:00.000Z",
      authRefreshable: false,
    });
    const summary = getProfileHealthSummary(profile, now);

    expect(summary).toMatchObject({
      launchable: false,
      statusLabel: "Sign-in required",
      statusTone: "destructive",
    });
    expect(getItem(profile, "minecraftToken")).toMatchObject({
      tone: "blocked",
      value: "Sign in again",
    });
    expect(getItem(profile, "refresh")).toMatchObject({
      tone: "blocked",
      value: "Sign in again",
    });
  });

  test("blocks offline profiles from Microsoft-gated launches", () => {
    const profile = createProfile({
      accountId: null,
      authExpiresAt: null,
      authRefreshable: false,
      entitlements: [],
      kind: "offline",
      ownershipCheckedAt: null,
    });
    const summary = getProfileHealthSummary(profile, now);

    expect(hasMinecraftOwnership(profile)).toBe(false);
    expect(summary).toMatchObject({
      launchable: false,
      statusLabel: "Offline blocked",
      statusTone: "destructive",
    });
    expect(getItem(profile, "microsoft")).toMatchObject({
      tone: "blocked",
      value: "Unavailable",
    });
    expect(getItem(profile, "minecraftToken")).toMatchObject({
      tone: "neutral",
      value: "Unavailable",
    });
  });

  test("reports missing Minecraft entitlements separately from sign-in state", () => {
    const profile = createProfile({
      entitlements: ["product_minecraft"],
    });
    const summary = getProfileHealthSummary(profile, now);

    expect(hasMinecraftOwnership(profile)).toBe(false);
    expect(summary).toMatchObject({
      launchable: false,
      statusLabel: "Ownership required",
      statusTone: "destructive",
    });
    expect(getItem(profile, "ownership")).toMatchObject({
      tone: "blocked",
      value: "License missing",
    });
  });
});
