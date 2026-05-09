import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { FolderOpenIcon, PlayIcon, PlusIcon, WrenchIcon } from "lucide-react";
import type { LauncherInstance } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { HeroBackground } from "@/views/main/features/dashboard/components/hero-background";
import { rpc } from "@/views/main/lib/rpc";

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
    <section className="relative min-h-[330px] overflow-hidden border-b border-border">
      <HeroBackground />

      <div className="relative flex min-h-[330px] flex-col justify-end px-4 pb-5 sm:px-6">
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
              <h1 className="max-w-3xl text-balance font-heading font-black text-4xl text-white leading-none max-sm:text-3xl">
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

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                disabled={launchDisabled}
                onClick={() => onPlayInstance(instance.id)}
                size="lg"
              >
                <PlayIcon data-icon="inline-start" className="fill-current" />
                Play
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
                className="border-white/[0.18] bg-white/[0.06] text-white/80 hover:bg-white/[0.12] hover:text-white"
              >
                <WrenchIcon data-icon="inline-start" />
                Manage
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void rpc.requestProxy.openExternal({
                    url: `file://${instance.gameDirectory}`,
                  });
                }}
                size="lg"
                variant="outline"
                className="border-white/[0.18] bg-white/[0.06] text-white/80 hover:bg-white/[0.12] hover:text-white"
              >
                <FolderOpenIcon data-icon="inline-start" />
                Open Folder
              </Button>
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
            <Button className="mt-2 w-fit" size="lg" onClick={onCreateInstance}>
              <PlusIcon data-icon="inline-start" />
              New Instance
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
