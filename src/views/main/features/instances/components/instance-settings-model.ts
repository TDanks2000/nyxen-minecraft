import type { LauncherProfile, ModLoader } from "@/shared/types";

export const INSTANCE_SETTINGS_LOADERS: Array<{
  label: string;
  value: ModLoader;
}> = [
  { value: "vanilla", label: "Vanilla" },
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "neoforge", label: "NeoForge" },
  { value: "quilt", label: "Quilt" },
];

export const INSTANCE_SETTINGS_RAM_STOPS = [
  512, 1024, 2048, 3072, 4096, 6144, 8192, 12288, 16384, 32768,
];

export const AUTO_PROFILE_VALUE = "__auto_profile__";

export const INSTANCE_SETTINGS_FLOW = [
  { label: "Details" },
  { label: "Version" },
  { label: "Performance" },
  { label: "Advanced" },
];

export const formatRam = (mb: number): string => {
  if (mb < 1024) return `${mb} MB`;
  return `${mb / 1024} GB`;
};

export const parseArgLines = (value: string): Array<string> =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

export const isVerifiedMinecraftProfile = (
  profile: LauncherProfile,
): boolean => {
  const entitlements = new Set(profile.entitlements);

  return (
    profile.kind === "microsoft" &&
    Boolean(profile.accountId) &&
    Boolean(profile.ownershipCheckedAt) &&
    entitlements.has("game_minecraft") &&
    entitlements.has("product_minecraft")
  );
};

export const getClosestRamIndex = (
  stops: Array<number>,
  value: number,
): number => {
  if (stops.length === 0) return 0;

  return stops.reduce((closestIndex, stop, index) => {
    const currentDistance = Math.abs(stop - value);
    const closestDistance = Math.abs((stops[closestIndex] ?? stop) - value);
    return currentDistance < closestDistance ? index : closestIndex;
  }, 0);
};
