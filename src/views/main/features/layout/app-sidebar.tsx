import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenIcon,
  CameraIcon,
  CheckIcon,
  GlobeIcon,
  HomeIcon,
  PackageIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import { type ComponentType, type SVGProps, useMemo } from "react";
import { InstanceIcon } from "@/views/main/features/instances/components/instance-artwork";
import { InstanceQuickPlayItem } from "@/views/main/features/instances/components/instance-card";
import { LOADER_LABELS } from "@/views/main/features/instances/components/instance-format";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { useLaunchPlan } from "@/views/main/features/instances/hooks/use-launch-plan";
import { useInstances } from "@/views/main/hooks/use-instances";
import { cn } from "@/views/main/lib/utils";

type NavItem = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  to: string;
  activeOn?: string;
};

const NAV_ITEMS: Array<NavItem> = [
  { label: "Home", icon: HomeIcon, to: "/", activeOn: "/" },
  {
    label: "Library",
    icon: BookOpenIcon,
    to: "/instances",
    activeOn: "/instances",
  },
  {
    label: "Profiles",
    icon: UserRoundIcon,
    to: "/profiles",
    activeOn: "/profiles",
  },
  {
    label: "Modpacks",
    icon: PackageIcon,
    to: "/modpacks",
    activeOn: "/modpacks",
  },
  { label: "Worlds", icon: GlobeIcon, to: "/worlds", activeOn: "/worlds" },
  {
    label: "Screenshots",
    icon: CameraIcon,
    to: "/screenshots",
    activeOn: "/screenshots",
  },
  {
    label: "Settings",
    icon: SettingsIcon,
    to: "/settings",
    activeOn: "/settings",
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const instancesHook = useInstances();
  const launchPlan = useLaunchPlan();

  const quickPlayInstances = useMemo(() => {
    return [...(instancesHook.data ?? [])]
      .sort((a, b) => {
        if (a.lastLaunchedAt && b.lastLaunchedAt)
          return (
            new Date(b.lastLaunchedAt).getTime() -
            new Date(a.lastLaunchedAt).getTime()
          );
        if (a.lastLaunchedAt) return -1;
        if (b.lastLaunchedAt) return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 3);
  }, [instancesHook.data]);
  const activeInstance = quickPlayInstances[0] ?? null;
  const initialInstancesLoading =
    instancesHook.loading && instancesHook.data === null;

  return (
    <aside className="flex w-14 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar md:w-52">
      {/* Primary navigation */}
      <nav className="flex flex-col gap-0.5 p-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.activeOn
            ? item.activeOn === "/"
              ? pathname === "/"
              : pathname === item.activeOn ||
                pathname.startsWith(`${item.activeOn}/`)
            : false;

          return (
            <Link
              key={item.label}
              to={item.to}
              title={item.label}
              className={cn(
                "flex h-9 items-center justify-center gap-3 rounded-md px-0 text-sm font-medium no-underline transition-colors md:justify-start md:px-3",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                isActive &&
                  "rounded-l-none border-primary border-l-[3px] bg-primary/[0.12] text-foreground md:pl-[10px]",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Play */}
      <div className="mt-4 mb-1.5 hidden px-3 md:block">
        <span className="text-[0.58rem] font-bold tracking-[0.15em] text-muted-foreground/50 uppercase">
          Quick Play
        </span>
      </div>

      <div className="hidden flex-col gap-0.5 px-2 md:flex">
        {initialInstancesLoading ? (
          ["quick-play-a", "quick-play-b", "quick-play-c"].map((key) => (
            <div
              key={key}
              className="flex items-center gap-2 h-10 px-2 rounded-md"
            >
              <div className="size-8 rounded-sm shrink-0 bg-muted animate-pulse" />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-2 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))
        ) : quickPlayInstances.length === 0 ? (
          <p className="px-2 text-[0.65rem] text-muted-foreground/60">
            No instances yet.
          </p>
        ) : (
          quickPlayInstances.map((item) => (
            <InstanceQuickPlayItem
              key={item.id}
              instance={item}
              launchDisabled={launchPlan.loadingInstanceId !== null}
              launchLoading={launchPlan.loadingInstanceId === item.id}
              onPlay={() => {
                void launchPlan.createLaunchPlan(item.id);
              }}
            />
          ))
        )}
      </div>

      {/* Bottom – active game */}
      <div className="mt-auto hidden border-sidebar-border border-t md:block">
        <div className="flex items-center gap-2 px-3 py-3 bg-primary/5">
          {activeInstance ? (
            <InstanceIcon
              instance={activeInstance}
              className="size-8 rounded-sm"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-muted">
              <PackageIcon className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="truncate text-xs font-semibold text-foreground leading-none">
              {activeInstance?.name ?? "No active instance"}
            </div>
            <div className="flex items-center mt-0.5 leading-none">
              <span className="size-1.5 rounded-full bg-primary mr-1 shrink-0 inline-block" />
              <span className="truncate text-[0.62rem] font-medium text-primary">
                {activeInstance
                  ? `${activeInstance.versionId} · ${LOADER_LABELS[activeInstance.loader]}`
                  : "Create one to play"}
              </span>
            </div>
          </div>
          <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <CheckIcon className="size-3 text-primary" />
          </div>
        </div>
      </div>
      <LaunchPlanSheet
        open={launchPlan.sheetOpen}
        onOpenChange={launchPlan.setSheetOpen}
        plan={launchPlan.activePlan}
      />
    </aside>
  );
}
