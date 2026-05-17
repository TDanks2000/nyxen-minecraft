import { Link } from "@tanstack/react-router";
import {
  FolderOpenIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  WrenchIcon,
} from "lucide-react";
import type { LauncherInstance } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { HeroBackground } from "@/views/main/features/dashboard/components/hero-background";
import { InstanceIcon } from "@/views/main/features/instances/components/instance-artwork";
import {
  formatInstanceLastPlayed,
  LOADER_LABELS,
} from "@/views/main/features/instances/components/instance-format";
import { openLocalPath } from "@/views/main/lib/open-local-path";

type DashboardHeroProps = {
  instance: LauncherInstance | null;
  launchDisabled: boolean;
  loading: boolean;
  onCreateInstance: () => void;
  onPlayInstance: (instanceId: string) => void;
};

export function DashboardHero({
  instance,
  launchDisabled,
  loading,
  onCreateInstance,
  onPlayInstance,
}: DashboardHeroProps) {
  return (
    <section className="relative min-h-[360px] overflow-hidden border-b border-border">
      <HeroBackground />

      <div className="relative flex min-h-[360px] items-end px-5 pb-8 sm:px-8">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-2.5 w-28 bg-white/[0.08]" />
            <Skeleton className="h-12 w-72 bg-white/[0.08]" />
            <Skeleton className="h-4 w-44 bg-white/[0.08]" />
            <Skeleton className="mt-5 h-10 w-36 bg-white/[0.08]" />
          </div>
        ) : instance ? (
          <div className="flex w-full items-end justify-between gap-8">
            {/* Left: text content */}
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="inline-block size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_2px_var(--primary)]" />
                <span className="font-bold text-[0.58rem] text-primary uppercase tracking-[0.22em]">
                  {instance.lastLaunchedAt ? "Last Played" : "Ready to Play"}
                </span>
              </div>
              <h1 className="mt-2 max-w-2xl text-balance font-heading font-black text-4xl text-white leading-[0.92] sm:text-5xl">
                {instance.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[0.65rem] font-semibold text-white/80 uppercase tracking-wide">
                  {LOADER_LABELS[instance.loader]}
                </span>
                <span className="text-white/30 text-xs">·</span>
                <span className="text-sm text-white/60 font-medium">
                  {instance.versionId}
                </span>
                {instance.lastLaunchedAt && (
                  <>
                    <span className="text-white/30 text-xs">·</span>
                    <span className="text-sm text-white/40">
                      {formatInstanceLastPlayed(instance.lastLaunchedAt, {
                        prefix: true,
                      })}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Button
                  disabled={launchDisabled}
                  onClick={() => onPlayInstance(instance.id)}
                  size="lg"
                  className="shadow-[0_6px_36px_-10px_var(--primary)]"
                >
                  <PlayIcon data-icon="inline-start" className="fill-current" />
                  Play Now
                </Button>

                <Button
                  render={
                    <Link
                      to="/instances/$instanceId"
                      params={{ instanceId: instance.id }}
                    />
                  }
                  nativeButton={false}
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/[0.07] text-white/80 backdrop-blur-sm hover:bg-white/[0.13] hover:text-white"
                >
                  <WrenchIcon data-icon="inline-start" />
                  Manage Mods
                </Button>

                <Button
                  render={<Link to="/modpacks" />}
                  nativeButton={false}
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/[0.07] text-white/80 backdrop-blur-sm hover:bg-white/[0.13] hover:text-white"
                >
                  <SearchIcon data-icon="inline-start" />
                  Browse Content
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    void openLocalPath(instance.gameDirectory, {
                      failureMessage: "Could not open the instance folder.",
                    });
                  }}
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/[0.07] text-white/70 backdrop-blur-sm hover:bg-white/[0.13] hover:text-white"
                >
                  <FolderOpenIcon data-icon="inline-start" />
                  Open Folder
                </Button>
              </div>
            </div>

            {/* Right: instance artwork */}
            <div className="hidden shrink-0 items-end pb-1 lg:flex">
              <div className="relative">
                <div
                  className="absolute inset-0 scale-150 rounded-full bg-primary/20 blur-3xl"
                  aria-hidden="true"
                />
                <InstanceIcon
                  instance={instance}
                  className="relative size-32 rounded-2xl shadow-2xl ring-1 ring-white/20 [image-rendering:pixelated]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h1 className="font-heading font-black text-4xl text-white leading-none sm:text-5xl">
              Start Playing
            </h1>
            <p className="max-w-xs text-base text-white/60">
              Create your first instance to play Minecraft with mods, shaders,
              and more.
            </p>
            <Button
              className="mt-3 w-fit shadow-[0_6px_36px_-10px_var(--primary)]"
              size="lg"
              onClick={onCreateInstance}
            >
              <PlusIcon data-icon="inline-start" />
              Create Instance
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
