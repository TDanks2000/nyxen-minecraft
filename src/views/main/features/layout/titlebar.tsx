import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  CopyIcon,
  Maximize2Icon,
  Minimize2Icon,
  MinusIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  UserPlusIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { APP_NAME } from "@/shared/constants";
import type { InstanceContent } from "@/shared/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/views/main/components/ui/dropdown-menu";
import { ContentBrowserDialog } from "@/views/main/features/curseforge/components/curseforge-browser-dialog";
import { toSelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-model";
import type { SelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-types";
import { useCurseForgeInstall } from "@/views/main/features/curseforge/use-curseforge-install";
import { NewInstanceDialog } from "@/views/main/features/instances/components/new-instance-dialog";
import { useInstanceContentStore } from "@/views/main/features/instances/hooks/use-instance-content-store";
import { TitlebarAppIcon } from "@/views/main/features/layout/titlebar-app-icon";
import { TitlebarProfileFace } from "@/views/main/features/layout/titlebar-profile-face";
import {
  getProfileStateLabel,
  isVerifiedMinecraftProfile,
} from "@/views/main/features/layout/titlebar-profile-model";
import { useModrinthInstall } from "@/views/main/features/modrinth/use-modrinth-install";
import { AddProfileDialog } from "@/views/main/features/profiles/components/add-profile-dialog";
import { useInstances } from "@/views/main/hooks/use-instances";
import { useLauncherStatus } from "@/views/main/hooks/use-launcher-status";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";

const NO_DRAG_CLASS = "electrobun-webkit-app-region-no-drag";

type TitlebarProps = {
  isRightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
};

export function Titlebar({
  isRightSidebarOpen,
  onToggleRightSidebar,
}: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [contentBrowserOpen, setContentBrowserOpen] = useState(false);
  const [contentBrowserContent, setContentBrowserContent] =
    useState<InstanceContent | null>(null);
  const [contentBrowserInstance, setContentBrowserInstance] =
    useState<SelectedInstance | null>(null);
  const [newInstanceOpen, setNewInstanceOpen] = useState(false);
  const navigate = useNavigate();
  const instances = useInstances();
  const launcherStatus = useLauncherStatus();
  const profiles = useProfiles();
  const replaceInstanceContent = useInstanceContentStore(
    (state) => state.replaceContent,
  );
  const curseForgeInstall = useCurseForgeInstall({
    onContentUpdated: (content) => {
      setContentBrowserContent(content);
      replaceInstanceContent(content);
    },
    onInstanceCreated: (instance) => {
      instances.upsertInstance(instance);
      launcherStatus.refresh();
    },
  });
  const modrinthInstall = useModrinthInstall({
    onContentUpdated: (content) => {
      setContentBrowserContent(content);
      replaceInstanceContent(content);
    },
    onInstanceCreated: (instance) => {
      instances.upsertInstance(instance);
      launcherStatus.refresh();
    },
  });
  const contentBrowserInstances = useMemo(
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

    const interval = setInterval(() => {
      syncWindowState().catch(console.error);
    }, 2_000);

    return () => clearInterval(interval);
  }, [syncWindowState]);

  useEffect(() => {
    if (!contentBrowserOpen || !contentBrowserInstance) {
      setContentBrowserContent(null);
      return;
    }

    let cancelled = false;
    setContentBrowserContent(null);

    rpc.requestProxy
      .getInstanceContent({ instanceId: contentBrowserInstance.id })
      .then((content) => {
        if (!cancelled) {
          setContentBrowserContent(content);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load installed catalog content.";
        toast.error(message);
        setContentBrowserContent(null);
      });

    return () => {
      cancelled = true;
    };
  }, [contentBrowserOpen, contentBrowserInstance]);

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
    ? "Hide downloads and activity"
    : "Show downloads and activity";

  return (
    <>
      <div className="electrobun-webkit-app-region-drag relative z-9999 flex h-12 shrink-0 select-none items-center border-sidebar-border border-b bg-sidebar px-2 sm:px-4">
        <div className="flex w-14 shrink-0 items-center gap-2.5 md:w-52">
          <TitlebarAppIcon />
          <div className="hidden flex-col leading-none md:flex">
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
            className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-2.5 font-semibold text-primary-foreground text-xs shadow-[0_0_14px_-4px_var(--primary)] transition-colors hover:bg-primary/90 sm:px-3.5"
            aria-label="Add instance"
            title="Add instance"
          >
            <PlusIcon className="size-3.5" />
            <span className="hidden sm:inline">Add Instance</span>
          </button>

          <button
            type="button"
            onClick={() => setContentBrowserOpen(true)}
            className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-sidebar-border bg-background/55 px-2.5 font-semibold text-foreground text-xs transition-colors hover:bg-muted sm:px-3"
            aria-label="Browse content"
            title="Browse content"
          >
            <SearchIcon className="size-3.5" />
            <span className="hidden sm:inline">Browse Content</span>
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
              <TitlebarProfileFace
                className="size-7"
                profile={activeProfile}
                scale={3.5}
              />
              <div className="hidden min-w-0 flex-col leading-none sm:flex">
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
                <TitlebarProfileFace
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
            {isMaximized ? (
              <Minimize2Icon className="size-3" />
            ) : (
              <Maximize2Icon className="size-3" />
            )}
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
        onCreated={() => {
          instances.refresh();
          launcherStatus.refresh();
        }}
      />
      <ContentBrowserDialog
        availableInstances={contentBrowserInstances}
        instanceContent={contentBrowserContent}
        installedContent={contentBrowserContent?.curseForge}
        onCompleteManualInstall={curseForgeInstall.completeManualInstall}
        onInstall={curseForgeInstall.install}
        onInstallModpack={curseForgeInstall.installModpack}
        onInstallModrinth={modrinthInstall.install}
        onInstallModrinthModpack={modrinthInstall.installModpack}
        onOpenManualDownload={curseForgeInstall.openManualDownload}
        open={contentBrowserOpen}
        onOpenChange={setContentBrowserOpen}
        onSelectInstance={setContentBrowserInstance}
        onUpdate={curseForgeInstall.update}
        selectedInstance={contentBrowserInstance}
      />
      <AddProfileDialog
        open={addProfileOpen}
        onOpenChange={setAddProfileOpen}
        onCreated={() => {
          profiles.refresh();
          launcherStatus.refresh();
        }}
      />
    </>
  );
}
