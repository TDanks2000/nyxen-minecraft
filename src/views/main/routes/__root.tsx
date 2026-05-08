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
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "@/views/main/components/ui/sonner";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { AppSidebar } from "@/views/main/features/layout/app-sidebar";
import { RightSidebar } from "@/views/main/features/layout/right-sidebar";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { rpc } from "@/views/main/lib/rpc";
import { APP_NAME } from "../../../shared/constants";

const NO_DRAG_CLASS = "electrobun-webkit-app-region-no-drag";

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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [newInstanceOpen, setNewInstanceOpen] = useState(false);
  const profiles = useProfiles();

  const activeProfile =
    profiles.data?.find(
      (profile) =>
        profile.kind === "microsoft" &&
        profile.accountId &&
        profile.ownershipCheckedAt &&
        profile.entitlements.includes("game_minecraft") &&
        profile.entitlements.includes("product_minecraft"),
    ) ??
    profiles.data?.[0] ??
    null;

  const syncWindowState = useCallback(async () => {
    const state = await rpc.requestProxy.getWindowState(null);
    setIsMaximized(state.maximized);
  }, []);

  useEffect(() => {
    syncWindowState().catch(console.error);
  }, [syncWindowState]);

  const handleMinimize = useCallback(() => {
    rpc.requestProxy.minimizeWindow(null).catch(console.error);
  }, []);

  const handleToggleMaximize = useCallback(async () => {
    const state = await rpc.requestProxy.toggleMaximizeWindow(null);
    setIsMaximized(state.maximized);
  }, []);

  const handleClose = useCallback(() => {
    rpc.requestProxy.closeWindow(null).catch(console.error);
  }, []);

  return (
    <>
      <div className="electrobun-webkit-app-region-drag relative z-[9999] flex h-12 shrink-0 select-none items-center border-sidebar-border border-b bg-sidebar px-4">
        {/* Logo – aligns with sidebar width */}
        <div className="flex items-center gap-2.5 w-52 shrink-0">
          <AppIcon />
          <div className="flex flex-col leading-none">
            <span className="font-black text-[0.68rem] tracking-[0.18em] text-foreground uppercase">
              {APP_NAME}
            </span>
            <span className="text-[0.52rem] text-muted-foreground tracking-wide uppercase mt-0.5">
              Next Generation Minecraft Launcher
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Titlebar actions */}
        <div className={`${NO_DRAG_CLASS} flex items-center gap-1.5`}>
          <button
            type="button"
            onClick={() => setNewInstanceOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-md transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add Instance
          </button>

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
          <Link
            to="/profiles"
            aria-label={
              activeProfile
                ? `Open profile ${activeProfile.displayName}`
                : "Open profiles"
            }
            className="flex items-center gap-2 px-2 py-1 rounded-md border border-transparent hover:border-sidebar-border/50 hover:bg-white/5 cursor-pointer transition-colors ml-1 no-underline"
          >
            <div className="relative size-7 shrink-0">
              <div className="size-7 rounded overflow-hidden bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                <span className="text-[0.55rem] font-black text-white select-none">
                  {activeProfile ? initials(activeProfile.displayName) : "?"}
                </span>
              </div>
              <span
                className={`absolute bottom-0 right-0 size-2 rounded-full ring-1 ring-sidebar ${activeProfile?.kind === "microsoft" ? "bg-green-400" : "bg-slate-400"}`}
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-semibold text-foreground">
                {activeProfile?.displayName ??
                  (profiles.loading ? "Loading…" : "No profile")}
              </span>
              <span className="text-[0.6rem] text-primary font-medium">
                {activeProfile?.kind === "microsoft"
                  ? "Online"
                  : activeProfile
                    ? "Offline"
                    : "—"}
              </span>
            </div>
            <ChevronDownIcon className="size-3 text-muted-foreground ml-0.5" />
          </Link>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Window controls */}
          <button
            type="button"
            className="size-6 flex items-center justify-center rounded-sm hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Minimize"
            onClick={handleMinimize}
          >
            <MinusIcon className="size-3" />
          </button>
          <button
            type="button"
            className="size-6 flex items-center justify-center rounded-sm hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onClick={() => {
              handleToggleMaximize().catch(console.error);
            }}
          >
            <SquareIcon className="size-3" />
          </button>
          <button
            type="button"
            className="size-6 flex items-center justify-center rounded-sm hover:bg-red-600 text-muted-foreground hover:text-white transition-colors"
            aria-label="Close"
            onClick={handleClose}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      </div>
      <NewInstanceDialog
        open={newInstanceOpen}
        onOpenChange={setNewInstanceOpen}
        onCreated={() => {}}
      />
    </>
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
