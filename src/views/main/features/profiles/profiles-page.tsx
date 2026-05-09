import { BanIcon, CrownIcon, PlusIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import type { LauncherProfile } from "@/shared/types";
import { Avatar, AvatarFallback } from "@/views/main/components/ui/avatar";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/views/main/components/ui/empty";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { AddProfileDialog } from "@/views/main/features/profiles/components/add-profile-dialog";
import {
  MinecraftSkinCharacter,
  MinecraftSkinHead,
} from "@/views/main/features/profiles/components/minecraft-skin";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { cn } from "@/views/main/lib/utils";

const KIND_COLORS: Record<string, string> = {
  microsoft: "bg-primary/20 text-primary",
  offline: "bg-destructive/10 text-destructive",
};

const PROFILE_SKELETON_IDS = [
  "profile-skeleton-one",
  "profile-skeleton-two",
  "profile-skeleton-three",
];

const isVerifiedMinecraftProfile = (profile: LauncherProfile): boolean => {
  const entitlements = new Set(profile.entitlements);

  return (
    profile.kind === "microsoft" &&
    Boolean(profile.accountId) &&
    Boolean(profile.ownershipCheckedAt) &&
    entitlements.has("game_minecraft") &&
    entitlements.has("product_minecraft")
  );
};

const getProfileStatus = (
  profile: LauncherProfile,
): { label: string; tone: "default" | "destructive" | "outline" } => {
  if (isVerifiedMinecraftProfile(profile)) {
    return { label: "Verified", tone: "default" };
  }

  if (profile.kind === "offline") {
    return { label: "Blocked", tone: "destructive" };
  }

  return { label: "Needs sign-in", tone: "outline" };
};

const formatAccountId = (accountId: string | null): string =>
  accountId ? `${accountId.slice(0, 8)}...${accountId.slice(-4)}` : "No UUID";

function MinecraftCharacterPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-0" aria-hidden="true">
      {/* Head */}
      <div className="size-16 rounded-sm border bg-[var(--chart-3)]" />
      {/* Torso + arms */}
      <div className="flex items-start">
        <div className="h-20 w-7 rounded-sm border bg-[var(--chart-3)]/70" />
        <div className="h-20 w-14 border bg-[color-mix(in_oklch,var(--chart-3)_70%,var(--primary))]" />
        <div className="h-20 w-7 rounded-sm border bg-[var(--chart-3)]/70" />
      </div>
      {/* Legs */}
      <div className="flex items-start gap-0.5">
        <div className="h-24 w-7 rounded-b-sm border bg-[var(--chart-3)]/55" />
        <div className="h-24 w-7 rounded-b-sm border bg-[var(--chart-3)]/55" />
      </div>
    </div>
  );
}

export function ProfilesPage() {
  const profilesHook = useProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);

  const profiles = profilesHook.data;
  const loading = profilesHook.loading;
  const primaryProfile =
    profiles?.find(isVerifiedMinecraftProfile) ?? profiles?.[0] ?? null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <section className="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
        <div>
          <span className="text-muted-foreground text-xs font-black uppercase">
            Accounts
          </span>
          <h1 className="mt-2 font-heading font-black text-4xl leading-none">
            Profiles
          </h1>
        </div>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Add Microsoft Profile
        </Button>
      </section>

      {profilesHook.error && (
        <div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {profilesHook.error}
          <button
            type="button"
            className="underline hover:no-underline text-xs ml-4 shrink-0"
            onClick={profilesHook.refresh}
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-[20rem_minmax(0,1fr)] gap-3 max-lg:grid-cols-1">
        {/* Profile list */}
        <div className="flex flex-col gap-3">
          {loading ? (
            PROFILE_SKELETON_IDS.map((skeletonId) => (
              <Card key={skeletonId}>
                <CardContent className="grid grid-cols-[3.25rem_minmax(0,1fr)_minmax(4rem,auto)] items-center gap-3">
                  <Skeleton className="size-12 rounded-md" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-14 rounded-full" />
                </CardContent>
              </Card>
            ))
          ) : !profiles || profiles.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheckIcon />
                </EmptyMedia>
                <EmptyTitle>No verified profiles</EmptyTitle>
                <EmptyDescription>
                  Sign in with the Microsoft account that owns Minecraft.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setDialogOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Add Microsoft Profile
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            profiles.map((profile) => {
              const toneClass =
                KIND_COLORS[profile.kind] ??
                "bg-muted/40 text-muted-foreground";
              const status = getProfileStatus(profile);
              const isActive = profile.id === primaryProfile?.id;
              return (
                <Card
                  key={profile.id}
                  className={cn(
                    "transition",
                    isActive && "border-primary/50 bg-primary/10",
                  )}
                >
                  <CardContent className="grid grid-cols-[3.25rem_minmax(0,1fr)_minmax(4rem,auto)] items-center gap-3">
                    <Avatar
                      size="lg"
                      className={cn("rounded-md", toneClass)}
                      aria-hidden="true"
                    >
                      <MinecraftSkinHead
                        displayName={profile.displayName}
                        skinUrl={profile.skinUrl}
                      />
                      <AvatarFallback className={cn("rounded-md", toneClass)}>
                        {profile.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <strong className="block truncate">
                        {profile.displayName}
                      </strong>
                      <small className="block truncate text-muted-foreground text-sm font-semibold capitalize">
                        {isVerifiedMinecraftProfile(profile)
                          ? formatAccountId(profile.accountId)
                          : profile.kind}
                      </small>
                    </div>
                    <Badge variant={status.tone}>{status.label}</Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Player preview */}
        <Card className="relative min-h-[24rem] overflow-hidden">
          {primaryProfile ? (
            <>
              <div className="absolute inset-x-0 top-16 flex justify-center">
                {primaryProfile.skinUrl ? (
                  <MinecraftSkinCharacter
                    displayName={primaryProfile.displayName}
                    fallback={<MinecraftCharacterPlaceholder />}
                    skinUrl={primaryProfile.skinUrl}
                  />
                ) : (
                  <MinecraftCharacterPlaceholder />
                )}
              </div>
              <CardHeader>
                <div>
                  <CardDescription>Selected player</CardDescription>
                  <CardTitle>{primaryProfile.displayName}</CardTitle>
                </div>
                <CardAction>
                  <CrownIcon className="size-5 text-[var(--chart-2)]" />
                </CardAction>
              </CardHeader>
              <CardContent className="absolute right-4 bottom-4 left-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  {primaryProfile.kind}
                </Badge>
                {isVerifiedMinecraftProfile(primaryProfile) ? (
                  <Badge>
                    <ShieldCheckIcon />
                    Verified owner
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <BanIcon />
                    Not launchable
                  </Badge>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16">
              <p className="text-muted-foreground text-sm">
                No profile selected
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                Add your first profile
              </Button>
            </div>
          )}
        </Card>
      </section>

      <AddProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => profilesHook.refresh()}
      />
    </div>
  );
}
