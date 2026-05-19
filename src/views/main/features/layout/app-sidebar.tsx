import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenIcon,
  CameraIcon,
  GlobeIcon,
  HomeIcon,
  PackageIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import { type ComponentType, type SVGProps, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/views/main/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/views/main/components/ui/tooltip";
import { InstanceIcon } from "@/views/main/features/instances/components/instance-artwork";
import { InstanceQuickPlayItem } from "@/views/main/features/instances/components/instance-card";
import { LOADER_LABELS } from "@/views/main/features/instances/components/instance-format";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { usePlayInstance } from "@/views/main/features/instances/hooks/use-play-instance";
import { useInstances } from "@/views/main/hooks/use-instances";
import { useIsMobile } from "@/views/main/hooks/use-mobile";
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
  const play = usePlayInstance({ onInstancesChanged: instancesHook.refresh });
  const isCollapsed = useIsMobile();

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

          const link = (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "relative flex h-9 items-center justify-center gap-3 rounded-md px-0 text-sm font-medium no-underline transition-colors md:justify-start md:px-3",
                "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isActive && "bg-sidebar-accent/60 text-foreground",
              )}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r-full bg-primary"
                />
              ) : null}
              <Icon className="size-4 shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );

          if (!isCollapsed) {
            return link;
          }

          return (
            <Tooltip key={item.label}>
              <TooltipTrigger render={link} />
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Quick Play */}
      <div className="mt-5 mb-1.5 hidden px-3 md:block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
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
          <p className="px-2 text-xs text-muted-foreground">
            No instances yet.
          </p>
        ) : (
          quickPlayInstances.map((item) => (
            <InstanceQuickPlayItem
              key={item.id}
              instance={item}
              launchDisabled={play.playActionState !== "idle"}
              launchLoading={play.activeInstanceId === item.id}
              onPlay={() => play.playInstance(item.id)}
            />
          ))
        )}
      </div>

      {/* Bottom – active game */}
      <div className="mt-auto hidden border-sidebar-border border-t md:block">
        <div className="flex items-center gap-2.5 px-3 py-3">
          {activeInstance ? (
            <div className="relative shrink-0">
              <InstanceIcon
                instance={activeInstance}
                className="size-8 rounded-md [image-rendering:pixelated]"
              />
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border border-sidebar bg-primary shadow-[0_0_6px_1px_var(--primary)]" />
            </div>
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <PackageIcon className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-foreground leading-none">
              {activeInstance?.name ?? "No active instance"}
            </div>
            <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground leading-none">
              {activeInstance
                ? `${activeInstance.versionId} · ${LOADER_LABELS[activeInstance.loader]}`
                : "Create one to play"}
            </div>
          </div>
        </div>
      </div>
      <LaunchPlanSheet
        open={play.launchPlan.sheetOpen}
        onOpenChange={play.launchPlan.setSheetOpen}
        plan={play.launchPlan.activePlan}
      />
      <AlertDialog
        open={play.missingArtifactsDialogOpen}
        onOpenChange={play.closeMissingArtifactsDialog}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Download missing files?</AlertDialogTitle>
            <AlertDialogDescription>
              {play.pendingMissingPlan
                ? `${play.pendingMissingPlan.missingArtifacts.length} required file${
                    play.pendingMissingPlan.missingArtifacts.length === 1
                      ? ""
                      : "s"
                  } missing. Download now and start Minecraft?`
                : "Required files are missing. Download now and start Minecraft?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={play.downloadMissingArtifactsAndLaunch}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
