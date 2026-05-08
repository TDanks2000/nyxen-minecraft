import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  BoxesIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudIcon,
  CpuIcon,
  FolderOpenIcon,
  GaugeIcon,
  LayoutGridIcon,
  ListIcon,
  MemoryStickIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  WrenchIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { useInstances } from "@/views/main/hooks/use-instances";
import { useLauncherStatus } from "@/views/main/hooks/use-launcher-status";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";
import type { LaunchPlan } from "../../../shared/types";

/* ─── Hero Background ─────────────────────────────────────────────── */
function HeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #160902 0%, #3d1607 15%, #6e2c0e 32%, #8a3a12 45%, #6b2b0a 58%, #2e1306 78%, #0e0503 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 100px at 68% 30%, rgba(255,190,50,0.3), transparent 80%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 42% at 68% 28%, rgba(210,100,20,0.58), transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 38% 48% at 84% 42%, rgba(110,30,120,0.32), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 28% at 60% 65%, rgba(140,60,10,0.28), transparent 70%)",
        }}
      />
      <div
        className="absolute right-0 bottom-0 w-3/4 h-2/3"
        style={{
          background: "rgba(8,4,2,0.82)",
          clipPath:
            "polygon(100% 100%, 0% 100%, 0% 88%, 4% 68%, 8% 80%, 11% 52%, 14% 65%, 17% 38%, 19% 55%, 22% 28%, 24% 42%, 26% 35%, 28% 44%, 30% 22%, 32% 38%, 34% 32%, 36% 42%, 39% 18%, 41% 36%, 44% 24%, 47% 40%, 50% 14%, 53% 36%, 56% 45%, 58% 28%, 61% 42%, 64% 16%, 67% 34%, 70% 48%, 73% 22%, 76% 38%, 79% 26%, 82% 44%, 85% 30%, 88% 46%, 91% 34%, 94% 50%, 97% 38%, 100% 44%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3"
        style={{
          background: "linear-gradient(0deg, rgba(6,3,1,0.88) 0%, transparent)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,1) 3px, rgba(0,0,0,1) 4px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(4,2,1,0.97) 0%, rgba(4,2,1,0.84) 26%, rgba(4,2,1,0.46) 48%, rgba(4,2,1,0.14) 64%, transparent 74%)",
        }}
      />
    </div>
  );
}

/* ─── Home Page ───────────────────────────────────────────────────── */
function HomePage() {
  const instancesHook = useInstances();
  const statusHook = useLauncherStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<LaunchPlan | null>(null);
  const [planLoadingId, setPlanLoadingId] = useState<string | null>(null);

  async function handlePlay(instanceId: string) {
    setPlanLoadingId(instanceId);
    try {
      const plan = await rpc.requestProxy.createLaunchPlan({ instanceId });
      setActivePlan(plan);
      setSheetOpen(true);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create launch plan",
      );
    } finally {
      setPlanLoadingId(null);
    }
  }

  const instances = instancesHook.data ?? [];

  // Most recently played instance (nulls last)
  const heroInstance =
    [...instances].sort((a, b) => {
      if (!a.lastLaunchedAt && !b.lastLaunchedAt) return 0;
      if (!a.lastLaunchedAt) return 1;
      if (!b.lastLaunchedAt) return -1;
      return (
        new Date(b.lastLaunchedAt).getTime() -
        new Date(a.lastLaunchedAt).getTime()
      );
    })[0] ?? null;

  const counts = statusHook.data?.counts;

  return (
    <div className="flex flex-col">
      {/* ── Active Instance Hero ── */}
      <section className="relative h-[330px] overflow-hidden border-b border-border">
        <HeroBg />

        <div className="relative h-full flex flex-col justify-end px-6 pb-5">
          {instancesHook.loading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24 bg-white/10" />
              <Skeleton className="h-10 w-64 bg-white/10" />
              <Skeleton className="h-4 w-40 bg-white/10" />
              <Skeleton className="h-9 w-32 mt-4 bg-white/10" />
            </div>
          ) : heroInstance ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary inline-block shrink-0" />
                <span className="text-[0.58rem] font-bold tracking-[0.2em] text-primary uppercase">
                  {heroInstance.lastLaunchedAt
                    ? "Last Played"
                    : "Ready to Play"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <h1 className="text-4xl font-black text-white leading-none">
                  {heroInstance.name}
                </h1>
              </div>
              <p className="text-sm text-white/60 mt-1.5 font-medium">
                {heroInstance.versionId} · {heroInstance.loader}
              </p>
              {heroInstance.lastLaunchedAt && (
                <p className="text-xs text-white/40 mt-1">
                  Played{" "}
                  {formatDistanceToNow(new Date(heroInstance.lastLaunchedAt), {
                    addSuffix: true,
                  })}
                </p>
              )}

              <div className="flex items-center gap-2 mt-5">
                <div className="flex rounded-md overflow-hidden shadow-[0_0_16px_rgba(74,222,128,0.2)]">
                  <button
                    type="button"
                    disabled={planLoadingId !== null}
                    onClick={() => handlePlay(heroInstance.id)}
                    className="flex items-center gap-1.5 h-9 pl-3.5 pr-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors disabled:opacity-60"
                  >
                    <PlayIcon className="size-3.5 fill-current" />
                    Play
                  </button>
                  <div className="w-px bg-primary-foreground/20" />
                  <button
                    type="button"
                    className="flex items-center h-9 px-2 bg-primary hover:bg-primary/80 text-primary-foreground transition-colors"
                  >
                    <ChevronDownIcon className="size-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-white/[0.18] bg-white/[0.06] hover:bg-white/[0.12] text-white/80 text-xs font-semibold transition-colors"
                >
                  <WrenchIcon className="size-3.5" />
                  Manage
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-white/[0.18] bg-white/[0.06] hover:bg-white/[0.12] text-white/80 text-xs font-semibold transition-colors"
                >
                  <FolderOpenIcon className="size-3.5" />
                  Open Folder
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center size-9 rounded-md border border-white/[0.18] bg-white/[0.06] hover:bg-white/[0.12] text-white/80 transition-colors"
                >
                  <MoreHorizontalIcon className="size-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-black text-white leading-none">
                No instances yet
              </h1>
              <p className="text-sm text-white/60">
                Create your first instance to get started.
              </p>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="flex items-center gap-1.5 h-9 px-4 mt-2 w-fit rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors"
              >
                <PlusIcon className="size-3.5" />
                New Instance
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="flex items-center border-b border-border bg-card/60 divide-x divide-border overflow-x-auto">
        {[
          {
            id: "instances",
            icon: BoxesIcon,
            label: "Instances",
            value: counts ? String(counts.instances) : "—",
          },
          {
            id: "profiles",
            icon: StarIcon,
            label: "Profiles",
            value: counts ? String(counts.profiles) : "—",
          },
          {
            id: "versions",
            icon: CheckCircle2Icon,
            label: "Versions cached",
            value: counts ? String(counts.versions) : "—",
          },
          { id: "java", icon: CpuIcon, label: "Java", value: "—" },
          { id: "memory", icon: MemoryStickIcon, label: "Memory", value: "—" },
          { id: "perf", icon: GaugeIcon, label: "Performance", value: "—" },
          { id: "sync", icon: CloudIcon, label: "Sync", value: "—" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="flex items-center gap-2.5 px-4 py-4 shrink-0"
            >
              <Icon className="size-4 text-primary/70 shrink-0" />
              <div className="flex flex-col leading-none">
                <span className="text-[0.58rem] text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </span>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  {statusHook.loading ? (
                    <Skeleton className="h-3 w-6 inline-block" />
                  ) : (
                    stat.value
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── My Instances ── */}
      <section className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-4">
          <h2 className="text-sm font-bold text-foreground mr-auto">
            My Instances{" "}
            <span className="text-muted-foreground font-normal">
              ({counts?.instances ?? "…"})
            </span>
          </h2>

          <div className="flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-background/60 text-xs text-muted-foreground w-44 shrink-0">
            <SearchIcon className="size-3.5 shrink-0" />
            <span>Search instances...</span>
          </div>

          <div className="flex border border-border rounded-md overflow-hidden shrink-0">
            <button
              type="button"
              className="flex items-center justify-center size-8 bg-accent text-accent-foreground transition-colors"
            >
              <LayoutGridIcon className="size-3.5" />
            </button>
            <button
              type="button"
              className="flex items-center justify-center size-8 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ListIcon className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-5 gap-3">
          {instancesHook.loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="rounded-md border border-border overflow-hidden"
              >
                <Skeleton className="h-28" />
                <div className="bg-card px-2.5 pt-2.5 pb-2.5 flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-5 w-full mt-1" />
                </div>
              </div>
            ))
          ) : instances.length === 0 ? (
            <div className="col-span-5 flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-muted-foreground text-sm">No instances yet.</p>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors"
              >
                <PlusIcon className="size-3.5" />
                New Instance
              </button>
            </div>
          ) : (
            instances.map((inst) => (
              <div
                key={inst.id}
                className={cn(
                  "relative flex flex-col rounded-md overflow-hidden border transition-all cursor-pointer group hover:-translate-y-0.5",
                  inst.id === heroInstance?.id
                    ? "border-primary/60 ring-1 ring-primary/30"
                    : "border-border hover:border-border/80",
                )}
              >
                <div className="relative h-28 shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/80 to-primary/20">
                  <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,color-mix(in_oklch,var(--foreground)_5%,transparent)_0_1px,transparent_1px_18px)]" />
                  {inst.id === heroInstance?.id && (
                    <div className="absolute inset-0 ring-inset ring-2 ring-primary/50 rounded-md pointer-events-none" />
                  )}
                </div>

                <div className="bg-card px-2.5 pt-2.5 pb-2.5">
                  <div className="text-xs font-semibold text-foreground truncate leading-none">
                    {inst.name}
                  </div>
                  <div className="text-[0.6rem] text-muted-foreground mt-0.5 truncate">
                    {inst.versionId} · {inst.loader}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[0.58rem] text-muted-foreground/60">
                      {inst.lastLaunchedAt
                        ? formatDistanceToNow(new Date(inst.lastLaunchedAt), {
                            addSuffix: true,
                          })
                        : "Never played"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={planLoadingId !== null}
                        onClick={() => handlePlay(inst.id)}
                        className={cn(
                          "size-5 rounded-sm flex items-center justify-center transition-colors",
                          planLoadingId === inst.id
                            ? "bg-primary/50 cursor-wait"
                            : "bg-primary hover:bg-primary/80",
                        )}
                      >
                        <PlayIcon className="size-2.5 fill-primary-foreground text-primary-foreground" />
                      </button>
                      <button
                        type="button"
                        className="size-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MoreHorizontalIcon className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {instances.length > 5 && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all instances
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
        )}
      </section>

      <div className="h-2" />

      <NewInstanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => instancesHook.refresh()}
      />
      <LaunchPlanSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        plan={activePlan}
      />
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
