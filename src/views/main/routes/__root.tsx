import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import {
  BellIcon,
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
  SettingsIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { AppSidebar } from "@/views/main/features/layout/app-sidebar";
import { RightSidebar } from "@/views/main/features/layout/right-sidebar";
import { Toaster } from "@/views/main/components/ui/sonner";

function AppIcon() {
  return (
    <div className="size-8 bg-primary rounded-sm shrink-0 overflow-hidden flex items-center justify-center">
      <svg
        viewBox="0 0 20 20"
        className="size-6"
        fill="none"
        aria-hidden="true"
      >
        <rect x="4" y="5" width="4" height="4" fill="#0a1208" />
        <rect x="12" y="5" width="4" height="4" fill="#0a1208" />
        <rect x="8" y="9" width="4" height="2" fill="#0a1208" />
        <rect x="6" y="11" width="3" height="4" fill="#0a1208" />
        <rect x="11" y="11" width="3" height="4" fill="#0a1208" />
      </svg>
    </div>
  );
}

function Titlebar() {
  return (
    <div className="flex items-center h-12 px-4 border-b border-sidebar-border bg-sidebar shrink-0">
      {/* Logo – aligns with sidebar width */}
      <div className="flex items-center gap-2.5 w-52 shrink-0">
        <AppIcon />
        <div className="flex flex-col leading-none">
          <span className="font-black text-[0.68rem] tracking-[0.18em] text-foreground uppercase">
            GDLauncher
          </span>
          <span className="text-[0.52rem] text-muted-foreground tracking-wide uppercase mt-0.5">
            Next Generation Minecraft Launcher
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Titlebar actions */}
      <div className="flex items-center gap-1.5">
        <Link
          to="/instances"
          className="flex items-center gap-1.5 h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-md transition-colors no-underline"
        >
          <PlusIcon className="size-3.5" />
          Add Instance
        </Link>

        <button
          type="button"
          className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Notifications"
        >
          <BellIcon className="size-4" />
        </button>

        <button
          type="button"
          className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Settings"
        >
          <SettingsIcon className="size-4" />
        </button>

        {/* User profile */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-transparent hover:border-sidebar-border/50 hover:bg-white/5 cursor-pointer transition-colors ml-1">
          <div className="relative size-7 shrink-0">
            <div className="size-7 rounded overflow-hidden bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
              <span className="text-[0.55rem] font-black text-white select-none">
                GD
              </span>
            </div>
            <span className="absolute bottom-0 right-0 size-2 rounded-full bg-green-400 ring-1 ring-sidebar" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xs font-semibold text-foreground">
              GorillaDev
            </span>
            <span className="text-[0.6rem] text-primary font-medium">
              Online
            </span>
          </div>
          <ChevronDownIcon className="size-3 text-muted-foreground ml-0.5" />
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Window controls */}
        <button
          type="button"
          className="size-6 flex items-center justify-center rounded-sm hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Minimize"
        >
          <MinusIcon className="size-3" />
        </button>
        <button
          type="button"
          className="size-6 flex items-center justify-center rounded-sm hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Maximize"
        >
          <SquareIcon className="size-3" />
        </button>
        <button
          type="button"
          className="size-6 flex items-center justify-center rounded-sm hover:bg-red-600 text-muted-foreground hover:text-white transition-colors"
          aria-label="Close"
        >
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}

function Shell() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <Titlebar />
      <div className="flex flex-1 min-h-0">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
        <RightSidebar />
      </div>
      <Toaster />
    </div>
  );
}

export const Route = createRootRoute({
  component: Shell,
});
