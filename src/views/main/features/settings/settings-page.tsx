import {
  CpuIcon,
  FolderDownIcon,
  FolderIcon,
  GaugeIcon,
  HardDriveIcon,
  MonitorIcon,
  PaletteIcon,
  SlidersHorizontalIcon,
  Volume2Icon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "@/views/main/components/theme-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { Switch } from "@/views/main/components/ui/switch";
import { useLauncherStatus } from "@/views/main/hooks/use-launcher-status";
import { useSettings } from "@/views/main/hooks/use-settings";

function SettingGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Icon className="size-3.5 text-primary shrink-0" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <div className="flex-1 h-px bg-border/60" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm divide-y divide-border/40">
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3 transition-colors hover:bg-muted/20">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function PathRow({
  icon: Icon,
  label,
  path,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/20">
      <Icon className="size-4 shrink-0 text-muted-foreground/60" />
      <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-right font-mono text-xs text-foreground/80"
        title={path}
      >
        {path}
      </span>
    </div>
  );
}

export function SettingsPage() {
  const settingsHook = useSettings();
  const statusHook = useLauncherStatus();
  const { setTheme } = useTheme();

  const settings = settingsHook.data?.values;
  const dirs = statusHook.data?.directories;

  const theme = (settings?.["app.theme"] as string) ?? "system";
  const javaManagement =
    settings?.["launcher.javaManagement"] === "app-controlled"
      ? "app-controlled"
      : "auto";
  const keepOpen = !!settings?.["launcher.keepOpenAfterLaunch"];
  const showSnapshots = !!settings?.["launcher.showSnapshots"];

  async function handleTheme(value: string) {
    setTheme(value as "system" | "light" | "dark");
    await settingsHook.updateSetting("app.theme", value);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-5">
      <section>
        <span className="text-muted-foreground text-xs font-black uppercase tracking-widest">
          Preferences
        </span>
        <h1 className="mt-2 font-heading font-black text-4xl leading-none">
          Settings
        </h1>
      </section>

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
                        App controlled
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

          <SettingGroup icon={SlidersHorizontalIcon} title="Behavior">
            {settingsHook.loading ? (
              ["keep-open", "show-snapshots"].map((key) => (
                <div key={key} className="px-4 py-3">
                  <Skeleton className="h-5 w-48 rounded-md" />
                </div>
              ))
            ) : (
              <>
                <SettingRow
                  label="Keep launcher open"
                  description="Don't close the launcher when a game starts"
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
              </>
            )}
          </SettingGroup>
        </div>

        {/* Right column: storage paths */}
        <div className="flex flex-col gap-5">
          <SettingGroup icon={FolderIcon} title="Storage">
            {statusHook.loading ? (
              ["root", "instances", "assets", "versions", "logs"].map((key) => (
                <div key={key} className="px-4 py-3">
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
              ))
            ) : dirs ? (
              <>
                <PathRow icon={HardDriveIcon} label="Root" path={dirs.root} />
                <PathRow
                  icon={HardDriveIcon}
                  label="Instances"
                  path={dirs.instances}
                />
                <PathRow icon={Volume2Icon} label="Assets" path={dirs.assets} />
                <PathRow icon={CpuIcon} label="Runtimes" path={dirs.runtimes} />
                <PathRow
                  icon={MonitorIcon}
                  label="Versions"
                  path={dirs.versions}
                />
                <PathRow icon={GaugeIcon} label="Logs" path={dirs.logs} />
              </>
            ) : null}
          </SettingGroup>
        </div>
      </div>
    </div>
  );
}
