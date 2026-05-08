import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenIcon,
  CameraIcon,
  CheckIcon,
  GlobeIcon,
  HomeIcon,
  Loader2Icon,
  PackageIcon,
  PlayIcon,
  PuzzleIcon,
  ServerIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import { type ComponentType, type SVGProps, useState } from "react";
import { toast } from "sonner";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { useInstances } from "@/views/main/hooks/use-instances";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";
import type { LaunchPlan, ModLoader } from "../../../../shared/types";

type NavItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  to: string;
  activeOn?: string;
};

const NAV_ITEMS: Array<NavItem> = [
  { label: "Home", icon: HomeIcon, to: "/", activeOn: "/" },
  { label: "Library", icon: BookOpenIcon, to: "/instances", activeOn: "/instances" },
  { label: "Profiles", icon: UserRoundIcon, to: "/profiles", activeOn: "/profiles" },
  { label: "Modpacks", icon: PackageIcon, to: "/" },
  { label: "Worlds", icon: GlobeIcon, to: "/" },
  { label: "Servers", icon: ServerIcon, to: "/" },
  { label: "Mods", icon: PuzzleIcon, to: "/" },
  { label: "Screenshots", icon: CameraIcon, to: "/" },
  {
    label: "Settings",
    icon: SettingsIcon,
    to: "/settings",
    activeOn: "/settings",
  },
];

const LOADER_COLORS: Record<ModLoader, string> = {
  vanilla: "bg-emerald-900",
  fabric: "bg-indigo-900",
  forge: "bg-amber-900",
  neoforge: "bg-orange-900",
  quilt: "bg-violet-900",
};

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const instancesHook = useInstances();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<LaunchPlan | null>(null);
  const [planLoadingId, setPlanLoadingId] = useState<string | null>(null);

  const quickPlayInstances = [...(instancesHook.data ?? [])]
    .sort((a, b) => {
      if (a.lastLaunchedAt && b.lastLaunchedAt)
        return new Date(b.lastLaunchedAt).getTime() - new Date(a.lastLaunchedAt).getTime();
      if (a.lastLaunchedAt) return -1;
      if (b.lastLaunchedAt) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 3);

  async function handlePlay(instanceId: string) {
    setPlanLoadingId(instanceId);
    try {
      const plan = await rpc.requestProxy.createLaunchPlan({ instanceId });
      setActivePlan(plan);
      setSheetOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create launch plan");
    } finally {
      setPlanLoadingId(null);
    }
  }

  return (
    <aside className="flex flex-col w-52 shrink-0 bg-sidebar border-r border-sidebar-border overflow-y-auto">
      {/* Primary navigation */}
      <nav className="flex flex-col gap-0.5 p-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.activeOn ? pathname === item.activeOn : false;

          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex items-center gap-3 h-9 px-3 text-sm font-medium no-underline transition-colors rounded-md",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                isActive &&
                  "bg-primary/[0.12] text-foreground border-l-[3px] border-primary rounded-l-none pl-[10px]",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Quick Play */}
      <div className="px-3 mt-4 mb-1.5">
        <span className="text-[0.58rem] font-bold tracking-[0.15em] text-muted-foreground/50 uppercase">
          Quick Play
        </span>
      </div>

      <div className="flex flex-col gap-0.5 px-2">
        {instancesHook.loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`qs-${i}`} className="flex items-center gap-2 h-10 px-2 rounded-md">
              <div className="size-8 rounded-sm shrink-0 bg-muted animate-pulse" />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-2 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))
        ) : quickPlayInstances.length === 0 ? (
          <p className="px-2 text-[0.65rem] text-muted-foreground/60">No instances yet.</p>
        ) : (
          quickPlayInstances.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 h-10 px-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors group"
            >
              <div className={cn("size-8 rounded-sm shrink-0", LOADER_COLORS[item.loader] ?? "bg-slate-800")} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-sidebar-foreground truncate leading-none">
                  {item.name}
                </div>
                <div className="text-[0.62rem] text-muted-foreground mt-0.5 leading-none">
                  {item.versionId} · {item.loader}
                </div>
              </div>
              <button
                type="button"
                disabled={planLoadingId !== null}
                onClick={() => handlePlay(item.id)}
                className="size-6 bg-primary hover:bg-primary/80 rounded-sm flex items-center justify-center shrink-0 opacity-40 group-hover:opacity-100 transition-opacity disabled:cursor-wait"
              >
                {planLoadingId === item.id ? (
                  <Loader2Icon className="size-2.5 text-primary-foreground animate-spin" />
                ) : (
                  <PlayIcon className="size-2.5 fill-primary-foreground text-primary-foreground" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom – active game */}
      <div className="mt-auto border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-3 bg-primary/5">
          <div className="size-8 rounded-sm shrink-0 bg-emerald-900 overflow-hidden flex items-center justify-center">
            <svg
              viewBox="0 0 16 16"
              className="size-5"
              fill="none"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="7" height="7" fill="#4a7c3a" />
              <rect x="8" y="1" width="7" height="7" fill="#5a3e28" />
              <rect x="1" y="8" width="7" height="7" fill="#5a3e28" />
              <rect x="8" y="8" width="7" height="7" fill="#4a7c3a" />
              <rect x="1" y="1" width="7" height="1" fill="#6db858" />
              <rect x="1" y="1" width="1" height="7" fill="#6db858" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground leading-none">
              Minecraft 1.20.4
            </div>
            <div className="flex items-center mt-0.5 leading-none">
              <span className="size-1.5 rounded-full bg-primary mr-1 shrink-0 inline-block" />
              <span className="text-[0.62rem] text-primary font-medium">
                Ready to play
              </span>
            </div>
          </div>
          <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <CheckIcon className="size-3 text-primary" />
          </div>
        </div>
      </div>
      <LaunchPlanSheet open={sheetOpen} onOpenChange={setSheetOpen} plan={activePlan} />
    </aside>
  );
}
