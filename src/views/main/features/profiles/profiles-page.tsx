import { BanIcon, CrownIcon, PlusIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import type { LauncherProfile } from "@/shared/types";
import { PageHeader } from "@/views/main/components/page-header";
import { Avatar, AvatarFallback } from "@/views/main/components/ui/avatar";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
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
import { MinecraftCharacterPlaceholder } from "@/views/main/features/profiles/components/minecraft-character-placeholder";
import {
  MinecraftSkinCharacter,
  MinecraftSkinHead,
} from "@/views/main/features/profiles/components/minecraft-skin";
import { ProfileHealthPanel } from "@/views/main/features/profiles/components/profile-health-panel";
import { hasMinecraftOwnership } from "@/views/main/features/profiles/profile-health-model";
import { useLauncherStatus } from "@/views/main/hooks/use-launcher-status";
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

const getProfileStatus = (
  profile: LauncherProfile,
): { label: string; tone: "default" | "destructive" | "outline" } => {
  if (hasMinecraftOwnership(profile)) {
    return { label: "Verified", tone: "default" };
  }

  if (profile.kind === "offline") {
    return { label: "Blocked", tone: "destructive" };
  }

  return { label: "Sign-in needed", tone: "outline" };
};

const formatAccountId = (accountId: string | null): string =>
  accountId ? `${accountId.slice(0, 8)}...${accountId.slice(-4)}` : "No UUID";

const getProfileKindLabel = (profile: LauncherProfile): string =>
  profile.kind === "offline" ? "Unavailable" : profile.kind;

export function ProfilesPage() {
  const profilesHook = useProfiles();
  const statusHook = useLauncherStatus();
  const [dialogOpen, setDialogOpen] = useState(false);

  const profiles = profilesHook.data;
  const loading = profilesHook.loading;
  const primaryProfile =
    profiles?.find(hasMinecraftOwnership) ?? profiles?.[0] ?? null;

  return (
    <div className="flex min-h-full w-full flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        eyebrow="Accounts"
        title="Profiles"
        description="Sign in with the Microsoft account that owns Minecraft to launch verified instances."
        actions={
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add Microsoft Profile
          </Button>
        }
      />

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

      <section className="grid grid-cols-[minmax(16rem,24rem)_minmax(0,1fr)] gap-4 max-lg:grid-cols-1">
        {/* Profile list */}
        <div className="flex flex-col gap-3">
          {loading ? (
            PROFILE_SKELETON_IDS.map((skeletonId) => (
              <div
                key={skeletonId}
                className="rounded-lg bg-card/70 p-3 shadow-sm ring-1 ring-border/45"
              >
                <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_minmax(4rem,auto)] items-center gap-3">
                  <Skeleton className="size-12 rounded-md" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
              </div>
            ))
          ) : !profiles || profiles.length === 0 ? (
            <Empty className="rounded-lg border border-dashed border-border/60 bg-card/55 py-12">
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
                <article
                  key={profile.id}
                  className={cn(
                    "rounded-lg bg-card/70 p-3 shadow-sm ring-1 ring-border/45 transition-colors",
                    isActive && "bg-primary/10 ring-primary/35",
                  )}
                >
                  <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_minmax(4rem,auto)] items-center gap-3">
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
                        {hasMinecraftOwnership(profile)
                          ? formatAccountId(profile.accountId)
                          : getProfileKindLabel(profile)}
                      </small>
                    </div>
                    <Badge variant={status.tone}>{status.label}</Badge>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {/* Player preview */}
          <section className="relative min-h-[24rem] overflow-hidden rounded-lg bg-card/80 shadow-[0_22px_70px_-56px_black] ring-1 ring-border/45">
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
                <div className="grid grid-cols-[1fr_auto] items-start gap-3 px-4 pt-4">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Selected player
                    </p>
                    <h2 className="font-heading text-base font-medium leading-snug">
                      {primaryProfile.displayName}
                    </h2>
                  </div>
                  <div>
                    <CrownIcon className="size-5 text-[var(--chart-2)]" />
                  </div>
                </div>
                <div className="absolute right-4 bottom-4 left-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {getProfileKindLabel(primaryProfile)}
                  </Badge>
                  {hasMinecraftOwnership(primaryProfile) ? (
                    <Badge>
                      <ShieldCheckIcon data-icon="inline-start" />
                      Verified owner
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <BanIcon data-icon="inline-start" />
                      Not launchable
                    </Badge>
                  )}
                </div>
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
                  <PlusIcon data-icon="inline-start" />
                  Add your first profile
                </Button>
              </div>
            )}
          </section>
          <ProfileHealthPanel profile={primaryProfile} />
        </div>
      </section>

      <AddProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          profilesHook.refresh();
          statusHook.refresh();
        }}
      />
    </div>
  );
}
