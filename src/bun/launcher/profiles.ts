import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type {
  CreateLauncherProfileInput,
  LauncherProfile,
  LauncherProfileKind,
} from "../../shared/types";
import { db } from "../db/client";
import * as schema from "../db/schema";

type ProfileRow = typeof schema.launcherProfiles.$inferSelect;

const profileKinds = new Set<LauncherProfileKind>(["microsoft", "offline"]);

const toProfile = (row: ProfileRow): LauncherProfile => ({
  accountId: row.accountId,
  createdAt: row.createdAt,
  displayName: row.displayName,
  id: row.id,
  kind: row.kind as LauncherProfileKind,
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

export const createLauncherProfile = (
  input: CreateLauncherProfileInput,
): LauncherProfile => {
  const now = new Date().toISOString();
  const profile = {
    accountId: input.accountId?.trim() || null,
    createdAt: now,
    displayName: normalizeDisplayName(input.displayName),
    id: `profile_${randomUUID()}`,
    kind: normalizeProfileKind(input.kind),
    updatedAt: now,
  };

  db.insert(schema.launcherProfiles).values(profile).run();

  return toProfile(profile);
};
