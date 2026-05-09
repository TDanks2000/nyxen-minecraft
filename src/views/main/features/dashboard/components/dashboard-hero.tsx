import { formatDistanceToNow } from "date-fns";
import {
  ChevronDownIcon,
  FolderOpenIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  WrenchIcon,
} from "lucide-react";
import type { LauncherInstance } from "@/shared/types";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { HeroBackground } from "@/views/main/features/dashboard/components/hero-background";

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
    <section className="relative h-[330px] overflow-hidden border-b border-border">
      <HeroBackground />

      <div className="relative flex h-full flex-col justify-end px-6 pb-5">
        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24 bg-white/10" />
            <Skeleton className="h-10 w-64 bg-white/10" />
            <Skeleton className="h-4 w-40 bg-white/10" />
            <Skeleton className="mt-4 h-9 w-32 bg-white/10" />
          </div>
        ) : instance ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="font-bold text-[0.58rem] text-primary uppercase tracking-[0.2em]">
                {instance.lastLaunchedAt ? "Last Played" : "Ready to Play"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <h1 className="font-black text-4xl text-white leading-none">
                {instance.name}
              </h1>
            </div>
            <p className="mt-1.5 font-medium text-sm text-white/60">
              {instance.versionId} · {instance.loader}
            </p>
            {instance.lastLaunchedAt && (
              <p className="mt-1 text-white/40 text-xs">
                Played{" "}
                {formatDistanceToNow(new Date(instance.lastLaunchedAt), {
                  addSuffix: true,
                })}
              </p>
            )}

            <div className="mt-5 flex items-center gap-2">
              <div className="flex overflow-hidden rounded-md shadow-[0_0_16px_rgba(74,222,128,0.2)]">
                <button
                  type="button"
                  disabled={launchDisabled}
                  onClick={() => onPlayInstance(instance.id)}
                  className="flex h-9 items-center gap-1.5 bg-primary pr-3 pl-3.5 font-bold text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  <PlayIcon className="size-3.5 fill-current" />
                  Play
                </button>
                <div className="w-px bg-primary-foreground/20" />
                <button
                  type="button"
                  className="flex h-9 items-center bg-primary px-2 text-primary-foreground transition-colors hover:bg-primary/80"
                >
                  <ChevronDownIcon className="size-3.5" />
                </button>
              </div>

              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-md border border-white/[0.18] bg-white/[0.06] px-3 font-semibold text-white/80 text-xs transition-colors hover:bg-white/[0.12]"
              >
                <WrenchIcon className="size-3.5" />
                Manage
              </button>
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-md border border-white/[0.18] bg-white/[0.06] px-3 font-semibold text-white/80 text-xs transition-colors hover:bg-white/[0.12]"
              >
                <FolderOpenIcon className="size-3.5" />
                Open Folder
              </button>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-md border border-white/[0.18] bg-white/[0.06] text-white/80 transition-colors hover:bg-white/[0.12]"
              >
                <MoreHorizontalIcon className="size-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <h1 className="font-black text-3xl text-white leading-none">
              No instances yet
            </h1>
            <p className="text-sm text-white/60">
              Create your first instance to get started.
            </p>
            <button
              type="button"
              onClick={onCreateInstance}
              className="mt-2 flex h-9 w-fit items-center gap-1.5 rounded-md bg-primary px-4 font-bold text-primary-foreground text-sm transition-colors hover:bg-primary/90"
            >
              <PlusIcon className="size-3.5" />
              New Instance
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
