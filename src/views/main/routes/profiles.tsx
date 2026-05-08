import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CrownIcon, PlusIcon, UserRoundIcon } from "lucide-react";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { AddProfileDialog } from "@/views/main/features/profiles/components/add-profile-dialog";
import { Avatar, AvatarFallback } from "@/views/main/components/ui/avatar";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { cn } from "@/views/main/lib/utils";

const KIND_COLORS: Record<string, string> = {
  microsoft: "bg-primary/20 text-primary",
  offline: "bg-[var(--chart-3)]/20 text-[var(--chart-3)]",
};

function ProfilesPage() {
  const profilesHook = useProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);

  const profiles = profilesHook.data;
  const loading = profilesHook.loading;
  const primaryProfile = profiles?.[0] ?? null;

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
          Add Profile
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

      <section className="grid grid-cols-[20rem_minmax(0,1fr)_17rem] gap-3 max-xl:grid-cols-[20rem_minmax(0,1fr)] max-lg:grid-cols-1">
        {/* Profile list */}
        <div className="flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={`sk-${i}`}>
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
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-muted-foreground text-sm">No profiles yet.</p>
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon className="size-4 mr-1.5" />
                Add Profile
              </Button>
            </div>
          ) : (
            profiles.map((profile, idx) => {
              const toneClass =
                KIND_COLORS[profile.kind] ?? "bg-muted/40 text-muted-foreground";
              const isActive = idx === 0;
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
                      <AvatarFallback className={cn("rounded-md", toneClass)}>
                        {profile.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <strong className="block truncate">
                        {profile.displayName}
                      </strong>
                      <small className="block truncate text-muted-foreground text-sm font-semibold capitalize">
                        {profile.kind}
                      </small>
                    </div>
                    <Badge variant={isActive ? "default" : "outline"}>
                      {isActive ? "Selected" : "Slot"}
                    </Badge>
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
              <div
                className="absolute inset-x-0 top-20 grid justify-center"
                aria-hidden="true"
              >
                <span className="h-14 w-16 border bg-[var(--chart-3)]" />
                <span className="h-24 w-24 border bg-[color-mix(in_oklch,var(--chart-3)_70%,var(--primary))]" />
                <div className="flex justify-center gap-2">
                  <span className="h-20 w-8 border bg-[var(--chart-3)]/80" />
                  <span className="h-20 w-8 border bg-[var(--chart-3)]/80" />
                </div>
              </div>
              <CardHeader className="relative has-data-[slot=card-action]:grid-cols-[1fr_auto]">
                <div>
                  <CardDescription>Selected player</CardDescription>
                  <CardTitle>{primaryProfile.displayName}</CardTitle>
                </div>
                <CrownIcon className="size-5 text-[var(--chart-2)]" />
              </CardHeader>
              <CardContent className="absolute right-4 bottom-4 left-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  {primaryProfile.kind}
                </Badge>
                {primaryProfile.accountId && (
                  <Badge variant="outline">Linked</Badge>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
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

        {/* Social — static, no API yet */}
        <Card className="max-xl:col-span-2 max-lg:col-span-1">
          <CardHeader className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
            <div>
              <CardDescription>Party</CardDescription>
              <CardTitle>Online Friends</CardTitle>
            </div>
            <UserRoundIcon className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Friends list is not available yet.
            </p>
          </CardContent>
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

export const Route = createFileRoute("/profiles")({
  component: ProfilesPage,
});
