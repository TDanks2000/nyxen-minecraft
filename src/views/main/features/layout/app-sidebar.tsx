import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenIcon,
  CameraIcon,
  CheckIcon,
  GlobeIcon,
  HomeIcon,
  PackageIcon,
  PlayIcon,
  PuzzleIcon,
  ServerIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/views/main/lib/utils";

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

const QUICK_PLAY = [
  {
    id: "survival",
    name: "Survival World",
    version: "1.20.4",
    loader: "Vanilla",
    colorClass: "bg-emerald-900",
  },
  {
    id: "create",
    name: "Create Above & Beyond",
    version: "1.16.5",
    loader: "Forge",
    colorClass: "bg-amber-900",
  },
  {
    id: "rlcraft",
    name: "RLCraft",
    version: "1.12.2",
    loader: "Forge",
    colorClass: "bg-red-950",
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
        {QUICK_PLAY.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 h-10 px-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors group"
          >
            <div
              className={cn("size-8 rounded-sm shrink-0", item.colorClass)}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-sidebar-foreground truncate leading-none">
                {item.name}
              </div>
              <div className="text-[0.62rem] text-muted-foreground mt-0.5 leading-none">
                {item.version} · {item.loader}
              </div>
            </div>
            <button
              type="button"
              className="size-6 bg-primary hover:bg-primary/80 rounded-sm flex items-center justify-center shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
            >
              <PlayIcon className="size-2.5 fill-primary-foreground text-primary-foreground" />
            </button>
          </div>
        ))}
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
    </aside>
  );
}
