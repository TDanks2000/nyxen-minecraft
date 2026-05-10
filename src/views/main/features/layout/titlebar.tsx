import { useNavigate } from "@tanstack/react-router";
import {
  BellIcon,
  ChevronDownIcon,
  CopyIcon,
  MinusIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  SquareIcon,
  UserPlusIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { APP_NAME } from "@/shared/constants";
import type { InstanceContent, LauncherProfile } from "@/shared/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/views/main/components/ui/dropdown-menu";
import { CurseForgeBrowserDialog } from "@/views/main/features/curseforge/components/curseforge-browser-dialog";
import { toSelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-model";
import type { SelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-types";
import { useCurseForgeInstall } from "@/views/main/features/curseforge/use-curseforge-install";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { AddProfileDialog } from "@/views/main/features/profiles/components/add-profile-dialog";
import { MinecraftSkinHead } from "@/views/main/features/profiles/components/minecraft-skin";
import { useInstances } from "@/views/main/hooks/use-instances";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";

const NO_DRAG_CLASS = "electrobun-webkit-app-region-no-drag";

type TitlebarProps = {
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
};

function AppIcon() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-primary">
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

  if (parts.length === 1) {
    return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  }

  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

const isVerifiedMinecraftProfile = (profile: LauncherProfile): boolean =>
  profile.kind === "microsoft" &&
  Boolean(profile.accountId) &&
  Boolean(profile.ownershipCheckedAt) &&
  profile.entitlements.includes("game_minecraft") &&
  profile.entitlements.includes("product_minecraft");

const getProfileStateLabel = (profile: LauncherProfile | null): string => {
  if (!profile) {
    return "No profile";
  }

  if (isVerifiedMinecraftProfile(profile)) {
    return "Online";
  }

  return profile.kind === "microsoft" ? "Needs sign-in" : "Unavailable";
};

function ProfileFace({
  className,
  initialsClassName,
  profile,
  scale,
}: {
  className?: string;
  initialsClassName?: string;
  profile: LauncherProfile | null;
  scale: number;
}) {
  const label = profile ? initials(profile.displayName) : "?";
  const verified = profile ? isVerifiedMinecraftProfile(profile) : false;

  return (
    <div className={cn("relative shrink-0", className)} aria-hidden="true">
      <div className="flex size-full items-center justify-center overflow-hidden rounded-md bg-linear-to-br from-amber-400 to-orange-600">
        {profile ? (
          <MinecraftSkinHead
            displayName={profile.displayName}
            scale={scale}
            skinUrl={profile.skinUrl}
          />
        ) : null}
        <span
          className={cn(
            "select-none font-black text-[0.55rem] text-white",
            initialsClassName,
          )}
        >
          {label}
        </span>
      </div>
      <span
        className={cn(
          "absolute right-0 bottom-0 size-2 rounded-full ring-1 ring-sidebar",
          verified ? "bg-primary" : "bg-muted-foreground",
        )}
      />
    </div>
  );
}

export function Titlebar({
  isRightSidebarOpen,
  onToggleRightSidebar,
}: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [curseForgeOpen, setCurseForgeOpen] = useState(false);
  const [curseForgeContent, setCurseForgeContent] =
    useState<InstanceContent | null>(null);
  const [curseForgeInstance, setCurseForgeInstance] =
    useState<SelectedInstance | null>(null);
  const [newInstanceOpen, setNewInstanceOpen] = useState(false);
  const navigate = useNavigate();
  const instances = useInstances();
  const profiles = useProfiles();
  const curseForgeInstall = useCurseForgeInstall({
    onContentUpdated: setCurseForgeContent,
    onInstanceCreated: instances.upsertInstance,
  });
  const curseForgeInstances = useMemo(
    () => (instances.data ?? []).map(toSelectedInstance),
    [instances.data],
  );

  const activeProfile =
    profiles.data?.find(isVerifiedMinecraftProfile) ??
    profiles.data?.[0] ??
    null;
  const profileStatusLabel = activeProfile
    ? getProfileStateLabel(activeProfile)
    : profiles.loading
      ? "Loading..."
      : "No profile";
  const savedProfileCount = profiles.data?.length ?? 0;

  const syncWindowState = useCallback(async () => {
    const state = await rpc.requestProxy.getWindowState(null);
    setIsMaximized(state.maximized);
  }, []);

  useEffect(() => {
    syncWindowState().catch(console.error);
  }, [syncWindowState]);

  useEffect(() => {
    if (!curseForgeOpen || !curseForgeInstance) {
      setCurseForgeContent(null);
      return;
    }

    let cancelled = false;
    setCurseForgeContent(null);

    rpc.requestProxy
      .getInstanceContent({ instanceId: curseForgeInstance.id })
      .then((content) => {
        if (!cancelled) {
          setCurseForgeContent(content);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load installed CurseForge content.";
        toast.error(message);
        setCurseForgeContent(null);
      });

    return () => {
      cancelled = true;
    };
  }, [curseForgeOpen, curseForgeInstance]);

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

  const handleCopyAccountId = useCallback(async () => {
    if (!activeProfile?.accountId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeProfile.accountId);
      toast.success("Minecraft UUID copied");
    } catch {
      toast.error("Could not copy Minecraft UUID");
    }
  }, [activeProfile?.accountId]);

  const openProfiles = useCallback(() => {
    void navigate({ to: "/profiles" });
  }, [navigate]);

  const openSettings = useCallback(() => {
    void navigate({ to: "/settings" });
  }, [navigate]);

  const rightSidebarToggleLabel = isRightSidebarOpen
    ? "Hide right sidebar"
    : "Show right sidebar";

  return (
    <>
      <div className="electrobun-webkit-app-region-drag relative z-9999 flex h-12 shrink-0 select-none items-center border-sidebar-border border-b bg-sidebar px-4">
        <div className="flex w-52 shrink-0 items-center gap-2.5">
          <AppIcon />
          <div className="flex flex-col leading-none">
            <span className="font-black text-[0.68rem] text-foreground uppercase tracking-[0.18em]">
              {APP_NAME}
            </span>
            <span className="mt-0.5 text-[0.52rem] text-muted-foreground uppercase tracking-wide">
              Next Generation Minecraft Launcher
            </span>
          </div>
        </div>

        <div className="flex-1" />

        <div className={`${NO_DRAG_CLASS} flex items-center gap-1.5`}>
          <button
            type="button"
            onClick={() => setNewInstanceOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 font-semibold text-primary-foreground text-xs transition-colors hover:bg-primary/90"
          >
            <PlusIcon className="size-3.5" />
            Add Instance
          </button>

          <button
            type="button"
            onClick={() => setCurseForgeOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-sidebar-border bg-background/55 px-3 font-semibold text-foreground text-xs transition-colors hover:bg-muted"
          >
            <SearchIcon className="size-3.5" />
            CurseForge
          </button>

          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label="Notifications"
          >
            <BellIcon className="size-4" />
          </button>

          <button
            type="button"
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
              isRightSidebarOpen && "bg-white/5 text-foreground",
            )}
            aria-label={rightSidebarToggleLabel}
            aria-pressed={isRightSidebarOpen}
            onClick={onToggleRightSidebar}
            title={rightSidebarToggleLabel}
          >
            {isRightSidebarOpen ? (
              <PanelRightCloseIcon className="size-4" />
            ) : (
              <PanelRightOpenIcon className="size-4" />
            )}
          </button>

          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label="Settings"
            onClick={openSettings}
          >
            <SettingsIcon className="size-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="ml-1 flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1 no-underline transition-colors hover:border-sidebar-border/50 hover:bg-white/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                />
              }
              aria-label={
                activeProfile
                  ? `Open profile options for ${activeProfile.displayName}`
                  : "Open profile options"
              }
            >
              <ProfileFace
                className="size-7"
                profile={activeProfile}
                scale={3.5}
              />
              <div className="flex min-w-0 flex-col leading-none">
                <span className="truncate font-semibold text-foreground text-xs">
                  {activeProfile?.displayName ??
                    (profiles.loading ? "Loading..." : "No profile")}
                </span>
                <span className="truncate font-medium text-[0.6rem] text-primary">
                  {profileStatusLabel}
                </span>
              </div>
              <ChevronDownIcon className="ml-0.5 size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="flex items-center gap-3 rounded-md bg-muted/45 p-2">
                <ProfileFace
                  className="size-10"
                  initialsClassName="text-xs"
                  profile={activeProfile}
                  scale={5}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm">
                    {activeProfile?.displayName ??
                      (profiles.loading ? "Loading..." : "No profile")}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {activeProfile?.accountId ??
                      `${savedProfileCount} saved profile${
                        savedProfileCount === 1 ? "" : "s"
                      }`}
                  </p>
                </div>
              </div>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={openProfiles}>
                  <UserRoundIcon />
                  Manage profiles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAddProfileOpen(true)}>
                  <UserPlusIcon />
                  Add Microsoft profile
                </DropdownMenuItem>
                {activeProfile?.accountId ? (
                  <DropdownMenuItem onClick={handleCopyAccountId}>
                    <CopyIcon />
                    Copy UUID
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => profiles.refresh()}>
                  <RefreshCwIcon />
                  Refresh profiles
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Launcher</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setNewInstanceOpen(true)}>
                  <PlusIcon />
                  Add instance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openSettings}>
                  <SettingsIcon />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-1 h-5 w-px bg-border" />

          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Minimize"
            onClick={handleMinimize}
          >
            <MinusIcon className="size-3" />
          </button>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onClick={() => {
              handleToggleMaximize().catch(console.error);
            }}
          >
            <SquareIcon className="size-3" />
          </button>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-red-600 hover:text-white"
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
        onCreated={() => instances.refresh()}
      />
      <CurseForgeBrowserDialog
        availableInstances={curseForgeInstances}
        installedContent={curseForgeContent?.curseForge}
        onCompleteManualInstall={curseForgeInstall.completeManualInstall}
        onInstall={curseForgeInstall.install}
        onInstallModpack={curseForgeInstall.installModpack}
        onOpenManualDownload={curseForgeInstall.openManualDownload}
        open={curseForgeOpen}
        onOpenChange={setCurseForgeOpen}
        onSelectInstance={setCurseForgeInstance}
        onUpdate={curseForgeInstall.update}
        selectedInstance={curseForgeInstance}
      />
      <AddProfileDialog
        open={addProfileOpen}
        onOpenChange={setAddProfileOpen}
        onCreated={() => profiles.refresh()}
      />
    </>
  );
}
