import {
  AlertTriangleIcon,
  CpuIcon,
  DownloadIcon,
  FolderDownIcon,
  FolderIcon,
  GaugeIcon,
  HardDriveIcon,
  MonitorIcon,
  PaletteIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  Volume2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/views/main/components/page-header";
import { useTheme } from "@/views/main/components/theme-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/views/main/components/ui/alert-dialog";
import { Button } from "@/views/main/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { Spinner } from "@/views/main/components/ui/spinner";
import { Switch } from "@/views/main/components/ui/switch";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { useInstanceContentStore } from "@/views/main/features/instances/hooks/use-instance-content-store";
import { PathRow } from "@/views/main/features/settings/components/path-row";
import { SettingGroup } from "@/views/main/features/settings/components/setting-group";
import { SettingRow } from "@/views/main/features/settings/components/setting-row";
import { useInstances } from "@/views/main/hooks/use-instances";
import { useLauncherStatus } from "@/views/main/hooks/use-launcher-status";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { useSettings } from "@/views/main/hooks/use-settings";
import { rpc } from "@/views/main/lib/rpc";

type StorageAction = "cache" | "data";

export function SettingsPage() {
  const settingsHook = useSettings();
  const statusHook = useLauncherStatus();
  const instancesHook = useInstances();
  const profilesHook = useProfiles();
  const { setTheme } = useTheme();
  const clearAllInstanceContent = useInstanceContentStore(
    (state) => state.clearAllContent,
  );
  const clearFinishedDownloadJobs = useDownloadQueueStore(
    (state) => state.clearFinishedDownloadJobs,
  );
  const [confirmStorageAction, setConfirmStorageAction] =
    useState<StorageAction | null>(null);
  const [clearingStorage, setClearingStorage] = useState<StorageAction | null>(
    null,
  );

  const settings = settingsHook.data?.values;
  const dirs = statusHook.data?.directories;

  const theme = (settings?.["app.theme"] as string) ?? "system";
  const javaManagement =
    settings?.["launcher.javaManagement"] === "app-controlled"
      ? "app-controlled"
      : "auto";
  const keepOpen =
    settings?.["launcher.keepOpenAfterLaunch"] === undefined
      ? true
      : !!settings["launcher.keepOpenAfterLaunch"];
  const lowEndMode = !!settings?.["launcher.lowEndMode"];
  const showSnapshots = !!settings?.["launcher.showSnapshots"];

  const downloadConcurrency =
    typeof settings?.["launcher.downloadConcurrency"] === "number"
      ? String(settings["launcher.downloadConcurrency"])
      : "auto";
  const assetConcurrency =
    typeof settings?.["launcher.assetConcurrency"] === "number"
      ? String(settings["launcher.assetConcurrency"])
      : "auto";
  const downloadTimeout =
    typeof settings?.["launcher.downloadTimeoutSeconds"] === "number"
      ? String(settings["launcher.downloadTimeoutSeconds"])
      : "auto";
  const downloadRetries =
    typeof settings?.["launcher.downloadRetries"] === "number"
      ? String(settings["launcher.downloadRetries"])
      : "auto";

  function handleDownloadSetting(key: string, value: string) {
    return settingsHook.updateSetting(
      key,
      value === "auto" ? null : Number(value),
    );
  }

  async function handleTheme(value: string) {
    setTheme(value as "system" | "light" | "dark");
    await settingsHook.updateSetting("app.theme", value);
  }

  async function handleClearStorage(action: StorageAction) {
    setClearingStorage(action);

    try {
      const result =
        action === "cache"
          ? await rpc.requestProxy.clearLauncherCache(null)
          : await rpc.requestProxy.clearLauncherData(null);

      toast.success(
        action === "cache"
          ? `Cache cleared (${result.removedPaths.length} location${
              result.removedPaths.length === 1 ? "" : "s"
            })`
          : "Launcher data cleared",
      );
      await clearFinishedDownloadJobs().catch(() => []);
      statusHook.refresh();

      if (action === "data") {
        instancesHook.refresh();
        profilesHook.refresh();
        clearAllInstanceContent();
      }

      setConfirmStorageAction(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clear storage",
      );
    } finally {
      setClearingStorage(null);
    }
  }

  const confirmStorageTitle =
    confirmStorageAction === "data" ? "Clear launcher data?" : "Clear cache?";
  const confirmStorageDescription =
    confirmStorageAction === "data"
      ? "This deletes every launcher instance, profile, saved world, mod, log, and downloaded file. Settings are kept."
      : "This deletes downloaded Minecraft artifacts, Java runtimes, temporary files, and per-instance cache. Instances and profiles are kept.";
  const confirmingDataClear = confirmStorageAction === "data";
  const storageActionPending =
    confirmStorageAction !== null && clearingStorage === confirmStorageAction;

  return (
    <>
      <div className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
        <PageHeader
          eyebrow="Preferences"
          title="Settings"
          description="Tune launcher behavior, downloads, and storage paths."
        />

        <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
          {/* Left column: launcher settings */}
          <div className="flex flex-col gap-5">
            <SettingGroup icon={PaletteIcon} title="Appearance">
              {settingsHook.loading ? (
                <div className="px-4 py-3">
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ) : (
                <SettingRow
                  label="Theme"
                  description="Set the application color scheme"
                >
                  <Select
                    value={theme}
                    onValueChange={(v) => v && handleTheme(v)}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </SettingRow>
              )}
            </SettingGroup>

            <SettingGroup icon={CpuIcon} title="Java">
              {settingsHook.loading ? (
                <div className="px-4 py-3">
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ) : (
                <SettingRow
                  label="Java management"
                  description="Use system or per-instance Java, or let Nyxen download the Mojang runtime required by each Minecraft version"
                >
                  <Select
                    value={javaManagement}
                    onValueChange={(v) =>
                      v &&
                      settingsHook.updateSetting("launcher.javaManagement", v)
                    }
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="auto">System Java</SelectItem>
                        <SelectItem value="app-controlled">
                          App-controlled
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </SettingRow>
              )}
              {!settingsHook.loading &&
                javaManagement === "app-controlled" &&
                dirs && (
                  <PathRow
                    icon={FolderDownIcon}
                    label="Install"
                    path={dirs.runtimes}
                  />
                )}
            </SettingGroup>

            <SettingGroup icon={DownloadIcon} title="Downloads">
              {settingsHook.loading ? (
                ["concurrency", "assets", "timeout", "retries"].map((key) => (
                  <div key={key} className="px-4 py-3">
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                ))
              ) : (
                <>
                  <SettingRow
                    label="Download concurrency"
                    description="Parallel downloads for JARs and libraries (auto adjusts for low-end mode)"
                  >
                    <Select
                      value={downloadConcurrency}
                      onValueChange={(v) =>
                        v &&
                        handleDownloadSetting("launcher.downloadConcurrency", v)
                      }
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="16">16</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow
                    label="Asset concurrency"
                    description="Parallel downloads for textures and sounds (auto adjusts for low-end mode)"
                  >
                    <Select
                      value={assetConcurrency}
                      onValueChange={(v) =>
                        v &&
                        handleDownloadSetting("launcher.assetConcurrency", v)
                      }
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="16">16</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                          <SelectItem value="32">32</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow
                    label="Request timeout"
                    description="Seconds before an individual download is abandoned"
                  >
                    <Select
                      value={downloadTimeout}
                      onValueChange={(v) =>
                        v &&
                        handleDownloadSetting(
                          "launcher.downloadTimeoutSeconds",
                          v,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="auto">Auto (60s)</SelectItem>
                          <SelectItem value="30">30s</SelectItem>
                          <SelectItem value="60">60s</SelectItem>
                          <SelectItem value="120">120s</SelectItem>
                          <SelectItem value="180">180s</SelectItem>
                          <SelectItem value="300">300s</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow
                    label="Retry attempts"
                    description="How many times a failed download is retried with backoff"
                  >
                    <Select
                      value={downloadRetries}
                      onValueChange={(v) =>
                        v &&
                        handleDownloadSetting("launcher.downloadRetries", v)
                      }
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="auto">Auto (3)</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </>
              )}
            </SettingGroup>

            <SettingGroup icon={SlidersHorizontalIcon} title="Behavior">
              {settingsHook.loading ? (
                ["keep-open", "show-snapshots", "low-end-mode"].map((key) => (
                  <div key={key} className="px-4 py-3">
                    <Skeleton className="h-5 w-48 rounded-md" />
                  </div>
                ))
              ) : (
                <>
                  <SettingRow
                    label="Keep launcher open"
                    description="Keep the launcher visible after starting Minecraft. Disable to minimize it on launch."
                  >
                    <Switch
                      checked={keepOpen}
                      onCheckedChange={(checked) =>
                        settingsHook.updateSetting(
                          "launcher.keepOpenAfterLaunch",
                          checked,
                        )
                      }
                    />
                  </SettingRow>
                  <SettingRow
                    label="Show snapshot builds"
                    description="Include pre-release and snapshot versions"
                  >
                    <Switch
                      checked={showSnapshots}
                      onCheckedChange={(checked) =>
                        settingsHook.updateSetting(
                          "launcher.showSnapshots",
                          checked,
                        )
                      }
                    />
                  </SettingRow>
                  <SettingRow
                    label="Low-end mode"
                    description="Reduce default download concurrency for modest hardware and networks"
                  >
                    <Switch
                      checked={lowEndMode}
                      onCheckedChange={(checked) =>
                        settingsHook.updateSetting(
                          "launcher.lowEndMode",
                          checked,
                        )
                      }
                    />
                  </SettingRow>
                </>
              )}
            </SettingGroup>
          </div>

          {/* Right column: storage paths */}
          <div className="flex flex-col gap-5">
            <SettingGroup icon={FolderIcon} title="Storage">
              {statusHook.loading ? (
                ["root", "instances", "assets", "versions", "logs"].map(
                  (key) => (
                    <div key={key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full rounded-md" />
                    </div>
                  ),
                )
              ) : dirs ? (
                <>
                  <PathRow icon={HardDriveIcon} label="Root" path={dirs.root} />
                  <PathRow
                    icon={HardDriveIcon}
                    label="Instances"
                    path={dirs.instances}
                  />
                  <PathRow
                    icon={Volume2Icon}
                    label="Assets"
                    path={dirs.assets}
                  />
                  <PathRow
                    icon={CpuIcon}
                    label="Runtimes"
                    path={dirs.runtimes}
                  />
                  <PathRow
                    icon={MonitorIcon}
                    label="Versions"
                    path={dirs.versions}
                  />
                  <PathRow icon={GaugeIcon} label="Logs" path={dirs.logs} />
                </>
              ) : null}
            </SettingGroup>

            <SettingGroup icon={HardDriveIcon} title="Maintenance">
              <SettingRow
                label="Clear cache"
                description="Remove downloaded artifacts, runtimes, temp files, and instance cache without deleting instances"
              >
                <Button
                  disabled={clearingStorage !== null}
                  onClick={() => setConfirmStorageAction("cache")}
                  size="sm"
                  variant="outline"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Clear cache
                </Button>
              </SettingRow>
            </SettingGroup>

            <SettingGroup
              icon={AlertTriangleIcon}
              title="Danger zone"
              tone="destructive"
            >
              <SettingRow
                label="Clear launcher data"
                description="Permanently removes instances, profiles, saved worlds, mods, logs, and downloaded launcher files. Settings are kept."
              >
                <Button
                  disabled={clearingStorage !== null}
                  onClick={() => setConfirmStorageAction("data")}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2Icon data-icon="inline-start" />
                  Clear data
                </Button>
              </SettingRow>
            </SettingGroup>
          </div>
        </div>
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !storageActionPending) {
            setConfirmStorageAction(null);
          }
        }}
        open={confirmStorageAction !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                confirmingDataClear ? "bg-destructive/10 text-destructive" : ""
              }
            >
              <AlertTriangleIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>{confirmStorageTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStorageDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={storageActionPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={storageActionPending || confirmStorageAction === null}
              onClick={(event) => {
                event.preventDefault();

                if (confirmStorageAction) {
                  void handleClearStorage(confirmStorageAction);
                }
              }}
              variant={confirmingDataClear ? "destructive" : "default"}
            >
              {storageActionPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2Icon data-icon="inline-start" />
              )}
              {storageActionPending ? "Clearing..." : "Clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
