import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type {
  CreateLauncherProfileInput,
  LauncherProfile,
  LauncherProfileKind,
} from "../../shared/types";
import { db } from "../db/client";
import * as schema from "../db/schema";

type ProfileRow = typeof schema.launcherProfiles.$inferSelect;

export type VerifiedMicrosoftProfileInput = {
  accountId: string;
  displayName: string;
  entitlements: Array<string>;
  minecraftAccessToken: string;
  minecraftAccessTokenExpiresAt: string;
  microsoftRefreshToken: string | null;
  ownershipCheckedAt: string;
  skinUrl: string | null;
};

export type LauncherProfileAuthSecrets = {
  minecraftAccessToken: string | null;
  minecraftAccessTokenExpiresAt: string | null;
  microsoftRefreshToken: string | null;
  profile: LauncherProfile;
};

const profileKinds = new Set<LauncherProfileKind>(["microsoft", "offline"]);

const parseEntitlements = (value: string | null): Array<string> => {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (entitlement): entitlement is string =>
          typeof entitlement === "string" && entitlement.trim().length > 0,
      );
    }
  } catch {
    return [];
  }

  return [];
};

const toProfile = (row: ProfileRow): LauncherProfile => ({
  accountId: row.accountId,
  authExpiresAt: row.minecraftAccessTokenExpiresAt,
  authRefreshable: Boolean(row.microsoftRefreshToken),
  createdAt: row.createdAt,
  displayName: row.displayName,
  entitlements: parseEntitlements(row.entitlements),
  id: row.id,
  kind: row.kind as LauncherProfileKind,
  ownershipCheckedAt: row.ownershipCheckedAt,
  skinUrl: row.skinUrl,
  updatedAt: row.updatedAt,
});

const normalizeProfileKind = (
  kind: LauncherProfileKind | undefined,
): LauncherProfileKind => {
  if (!kind) {
    return "offline";
  }

  if (!profileKinds.has(kind)) {
    throw new Error("Unsupported launcher profile kind.");
  }

  return kind;
};

const normalizeDisplayName = (displayName: string): string => {
  const normalized = displayName.trim();

  if (normalized.length < 3 || normalized.length > 32) {
    throw new Error(
      "Profile display name must be between 3 and 32 characters.",
    );
  }

  return normalized;
};

const normalizeAccountId = (accountId: string): string => {
  const normalized = accountId.trim();

  if (!normalized) {
    throw new Error("Minecraft account id is required.");
  }

  return normalized;
};

const normalizeEntitlements = (entitlements: Array<string>): Array<string> => {
  const normalized = [
    ...new Set(
      entitlements
        .map((entitlement) => entitlement.trim())
        .filter((entitlement) => entitlement.length > 0),
    ),
  ];

  return normalized.sort((a, b) => a.localeCompare(b));
};

export const listLauncherProfiles = (): Array<LauncherProfile> =>
  db
    .select()
    .from(schema.launcherProfiles)
    .orderBy(asc(schema.launcherProfiles.displayName))
    .all()
    .map(toProfile);

export const getLauncherProfile = (
  profileId: string,
): LauncherProfile | null => {
  const normalizedId = profileId.trim();

  if (!normalizedId) {
    return null;
  }

  const row =
    db
      .select()
      .from(schema.launcherProfiles)
      .where(eq(schema.launcherProfiles.id, normalizedId))
      .get() ?? null;

  return row ? toProfile(row) : null;
};

export const getFirstLauncherProfile = (): LauncherProfile | null => {
  const row =
    db
      .select()
      .from(schema.launcherProfiles)
      .orderBy(asc(schema.launcherProfiles.displayName))
      .get() ?? null;

  return row ? toProfile(row) : null;
};

export const isProfileVerifiedForMinecraft = (
  profile: LauncherProfile | null,
): profile is LauncherProfile => {
  if (!profile || profile.kind !== "microsoft" || !profile.accountId) {
    return false;
  }

  const entitlements = new Set(profile.entitlements);

  return (
    Boolean(profile.ownershipCheckedAt) &&
    entitlements.has("game_minecraft") &&
    entitlements.has("product_minecraft")
  );
};

export const getFirstVerifiedMicrosoftProfile = (): LauncherProfile | null =>
  listLauncherProfiles().find(isProfileVerifiedForMinecraft) ?? null;

export const createLauncherProfile = (
  input: CreateLauncherProfileInput,
): LauncherProfile => {
  const now = new Date().toISOString();
  const profile = {
    accountId: input.accountId?.trim() || null,
    createdAt: now,
    displayName: normalizeDisplayName(input.displayName),
    entitlements: null,
    id: `profile_${randomUUID()}`,
    kind: normalizeProfileKind(input.kind),
    minecraftAccessToken: null,
    minecraftAccessTokenExpiresAt: null,
    microsoftRefreshToken: null,
    ownershipCheckedAt: null,
    skinUrl: null,
    updatedAt: now,
  };

  db.insert(schema.launcherProfiles).values(profile).run();

  return toProfile(profile);
};

export const upsertVerifiedMicrosoftProfile = (
  input: VerifiedMicrosoftProfileInput,
): LauncherProfile => {
  const now = new Date().toISOString();
  const accountId = normalizeAccountId(input.accountId);
  const displayName = normalizeDisplayName(input.displayName);
  const entitlements = normalizeEntitlements(input.entitlements);
  const values = {
    accountId,
    displayName,
    entitlements: JSON.stringify(entitlements),
    kind: "microsoft",
    minecraftAccessToken: input.minecraftAccessToken,
    minecraftAccessTokenExpiresAt: input.minecraftAccessTokenExpiresAt,
    microsoftRefreshToken: input.microsoftRefreshToken,
    ownershipCheckedAt: input.ownershipCheckedAt,
    skinUrl: input.skinUrl,
    updatedAt: now,
  };
  const existing =
    db
      .select()
      .from(schema.launcherProfiles)
      .where(
        and(
          eq(schema.launcherProfiles.accountId, accountId),
          eq(schema.launcherProfiles.kind, "microsoft"),
        ),
      )
      .get() ?? null;

  if (existing) {
    const updated = {
      ...existing,
      ...values,
    };

    db.update(schema.launcherProfiles)
      .set(values)
      .where(eq(schema.launcherProfiles.id, existing.id))
      .run();

    return toProfile(updated);
  }

  const profile = {
    ...values,
    createdAt: now,
    id: `profile_${randomUUID()}`,
  };

  db.insert(schema.launcherProfiles).values(profile).run();

  return toProfile(profile);
};

export const updateVerifiedMicrosoftProfile = (
  profileId: string,
  input: VerifiedMicrosoftProfileInput,
): LauncherProfile => {
  const existing =
    db
      .select()
      .from(schema.launcherProfiles)
      .where(eq(schema.launcherProfiles.id, profileId.trim()))
      .get() ?? null;

  if (!existing) {
    throw new Error("Selected launcher profile does not exist.");
  }

  const now = new Date().toISOString();
  const values = {
    accountId: normalizeAccountId(input.accountId),
    displayName: normalizeDisplayName(input.displayName),
    entitlements: JSON.stringify(normalizeEntitlements(input.entitlements)),
    kind: "microsoft",
    minecraftAccessToken: input.minecraftAccessToken,
    minecraftAccessTokenExpiresAt: input.minecraftAccessTokenExpiresAt,
    microsoftRefreshToken: input.microsoftRefreshToken,
    ownershipCheckedAt: input.ownershipCheckedAt,
    skinUrl: input.skinUrl,
    updatedAt: now,
  };
  const updated = {
    ...existing,
    ...values,
  };

  db.update(schema.launcherProfiles)
    .set(values)
    .where(eq(schema.launcherProfiles.id, existing.id))
    .run();

  return toProfile(updated);
};

export const getLauncherProfileAuthSecrets = (
  profileId: string,
): LauncherProfileAuthSecrets | null => {
  const normalizedId = profileId.trim();

  if (!normalizedId) {
    return null;
  }

  const row =
    db
      .select()
      .from(schema.launcherProfiles)
      .where(eq(schema.launcherProfiles.id, normalizedId))
      .get() ?? null;

  if (!row) {
    return null;
  }

  return {
    minecraftAccessToken: row.minecraftAccessToken,
    minecraftAccessTokenExpiresAt: row.minecraftAccessTokenExpiresAt,
    microsoftRefreshToken: row.microsoftRefreshToken,
    profile: toProfile(row),
  };
};
