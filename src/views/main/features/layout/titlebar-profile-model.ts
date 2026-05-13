import type { LauncherProfile } from "@/shared/types";

export function getProfileInitials(name: string): string {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  }

  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

export const isVerifiedMinecraftProfile = (profile: LauncherProfile): boolean =>
  profile.kind === "microsoft" &&
  Boolean(profile.accountId) &&
  Boolean(profile.ownershipCheckedAt) &&
  profile.entitlements.includes("game_minecraft") &&
  profile.entitlements.includes("product_minecraft");

export const getProfileStateLabel = (
  profile: LauncherProfile | null,
): string => {
  if (!profile) return "No profile";
  if (isVerifiedMinecraftProfile(profile)) return "Online";
  return profile.kind === "microsoft" ? "Needs sign-in" : "Unavailable";
};
