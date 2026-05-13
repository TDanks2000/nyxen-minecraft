import type { LauncherProfile } from "@/shared/types";

export type ProfileHealthTone = "blocked" | "neutral" | "ready" | "warning";

export type ProfileHealthItem = {
  detail: string | null;
  id: "microsoft" | "xbox" | "minecraftToken" | "ownership" | "refresh";
  label: string;
  tone: ProfileHealthTone;
  value: string;
};

export type ProfileHealthSummary = {
  items: Array<ProfileHealthItem>;
  launchable: boolean;
  statusLabel: string;
  statusTone: "default" | "destructive" | "outline" | "secondary";
};

const launchRefreshThresholdMs = 60_000;

export const hasMinecraftOwnership = (profile: LauncherProfile): boolean => {
  const entitlements = new Set(profile.entitlements);

  return (
    profile.kind === "microsoft" &&
    Boolean(profile.accountId) &&
    Boolean(profile.ownershipCheckedAt) &&
    entitlements.has("game_minecraft") &&
    entitlements.has("product_minecraft")
  );
};

const formatAccountDetail = (profile: LauncherProfile): string | null =>
  profile.accountId ? `UUID ${profile.accountId.slice(0, 8)}...` : null;

const getTokenState = (
  profile: LauncherProfile,
  now: Date,
): {
  expiresAt: Date | null;
  refreshNeeded: boolean;
  valid: boolean;
} => {
  const expiresAt = profile.authExpiresAt
    ? new Date(profile.authExpiresAt)
    : null;
  const expiresAtTime = expiresAt?.getTime() ?? Number.NaN;

  if (!expiresAt || !Number.isFinite(expiresAtTime)) {
    return { expiresAt: null, refreshNeeded: true, valid: false };
  }

  const refreshNeeded =
    expiresAtTime <= now.getTime() + launchRefreshThresholdMs;

  return {
    expiresAt,
    refreshNeeded,
    valid: !refreshNeeded,
  };
};

export const getProfileHealthSummary = (
  profile: LauncherProfile,
  now = new Date(),
): ProfileHealthSummary => {
  const isMicrosoft = profile.kind === "microsoft";
  const hasAccount = isMicrosoft && Boolean(profile.accountId);
  const ownsMinecraft = hasMinecraftOwnership(profile);
  const token = getTokenState(profile, now);
  const canRefresh = isMicrosoft && profile.authRefreshable === true;
  const hasLaunchAuth = ownsMinecraft && (token.valid || canRefresh);
  const needsRefresh = ownsMinecraft && token.refreshNeeded && canRefresh;

  const microsoftItem: ProfileHealthItem = !isMicrosoft
    ? {
        detail: "No Microsoft account linked",
        id: "microsoft",
        label: "Microsoft auth",
        tone: "blocked",
        value: "Unavailable",
      }
    : hasAccount
      ? {
          detail: formatAccountDetail(profile),
          id: "microsoft",
          label: "Microsoft auth",
          tone: "ready",
          value: "Linked",
        }
      : {
          detail: "Sign in to link a Microsoft account",
          id: "microsoft",
          label: "Microsoft auth",
          tone: "blocked",
          value: "Needs sign-in",
        };

  const xboxItem: ProfileHealthItem =
    hasAccount && profile.ownershipCheckedAt
      ? {
          detail: "Auth chain completed during ownership check",
          id: "xbox",
          label: "Xbox auth",
          tone: ownsMinecraft ? "ready" : "warning",
          value: ownsMinecraft ? "Verified" : "Checked",
        }
      : {
          detail: isMicrosoft ? "Waiting for Microsoft sign-in" : null,
          id: "xbox",
          label: "Xbox auth",
          tone: isMicrosoft ? "warning" : "blocked",
          value: isMicrosoft ? "Not checked" : "Unavailable",
        };

  const tokenItem: ProfileHealthItem = !isMicrosoft
    ? {
        detail: null,
        id: "minecraftToken",
        label: "Minecraft token",
        tone: "neutral",
        value: "Unavailable",
      }
    : token.valid
      ? {
          detail: profile.authExpiresAt,
          id: "minecraftToken",
          label: "Minecraft token",
          tone: "ready",
          value: "Valid",
        }
      : canRefresh
        ? {
            detail: profile.authExpiresAt,
            id: "minecraftToken",
            label: "Minecraft token",
            tone: "warning",
            value: "Refresh needed",
          }
        : {
            detail: profile.authExpiresAt,
            id: "minecraftToken",
            label: "Minecraft token",
            tone: "blocked",
            value: "Sign in again",
          };

  const ownershipItem: ProfileHealthItem = ownsMinecraft
    ? {
        detail: profile.ownershipCheckedAt,
        id: "ownership",
        label: "Ownership",
        tone: "ready",
        value: "Java Edition verified",
      }
    : {
        detail: profile.ownershipCheckedAt,
        id: "ownership",
        label: "Ownership",
        tone: isMicrosoft ? "blocked" : "neutral",
        value:
          isMicrosoft && profile.ownershipCheckedAt
            ? "License missing"
            : "Not verified",
      };

  const refreshItem: ProfileHealthItem = canRefresh
    ? {
        detail: needsRefresh ? "Used before launch" : "Stored securely",
        id: "refresh",
        label: "Refresh",
        tone: "ready",
        value: needsRefresh ? "Ready on launch" : "Ready",
      }
    : {
        detail: isMicrosoft ? "No refresh credential available" : null,
        id: "refresh",
        label: "Refresh",
        tone: isMicrosoft ? "blocked" : "neutral",
        value: isMicrosoft ? "Sign in again" : "Unavailable",
      };

  if (hasLaunchAuth && needsRefresh) {
    return {
      items: [microsoftItem, xboxItem, tokenItem, ownershipItem, refreshItem],
      launchable: true,
      statusLabel: "Refresh on launch",
      statusTone: "outline",
    };
  }

  if (hasLaunchAuth) {
    return {
      items: [microsoftItem, xboxItem, tokenItem, ownershipItem, refreshItem],
      launchable: true,
      statusLabel: "Launch ready",
      statusTone: "default",
    };
  }

  if (!isMicrosoft) {
    return {
      items: [microsoftItem, xboxItem, tokenItem, ownershipItem, refreshItem],
      launchable: false,
      statusLabel: "Offline blocked",
      statusTone: "destructive",
    };
  }

  return {
    items: [microsoftItem, xboxItem, tokenItem, ownershipItem, refreshItem],
    launchable: false,
    statusLabel: ownsMinecraft ? "Sign-in required" : "Ownership required",
    statusTone: "destructive",
  };
};
