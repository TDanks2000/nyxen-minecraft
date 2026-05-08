import { createFileRoute } from "@tanstack/react-router";
import {
  CpuIcon,
  FolderIcon,
  GaugeIcon,
  HardDriveIcon,
  MonitorIcon,
  SlidersHorizontalIcon,
  Volume2Icon,
} from "lucide-react";
import { useTheme } from "@/views/main/components/theme-provider";
import { useSettings } from "@/views/main/hooks/use-settings";
import { useLauncherStatus } from "@/views/main/hooks/use-launcher-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { Switch } from "@/views/main/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { Label } from "@/views/main/components/ui/label";

const ALLOCATION = [
  ["Memory", "—", 0],
  ["Render distance", "—", 0],
  ["Download threads", "—", 0],
] as const;

function SettingsPage() {
  const settingsHook = useSettings();
  const statusHook = useLauncherStatus();
  const { setTheme } = useTheme();

  const settings = settingsHook.data?.values;
  const dirs = statusHook.data?.directories;

  const theme = (settings?.["app.theme"] as string) ?? "system";
  const keepOpen = !!(settings?.["launcher.keepOpenAfterLaunch"]);
  const showSnapshots = !!(settings?.["launcher.showSnapshots"]);

  async function handleTheme(value: string) {
    setTheme(value as "system" | "light" | "dark");
    await settingsHook.updateSetting("app.theme", value);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <section>
        <span className="text-muted-foreground text-xs font-black uppercase">
          Preferences
        </span>
        <h1 className="mt-2 font-heading font-black text-4xl leading-none">
          Settings
        </h1>
      </section>

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        {/* Runtime allocation — static placeholder for future */}
        <Card className="min-h-80">
          <CardHeader className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
            <div>
              <CardDescription>Performance</CardDescription>
              <CardTitle>Runtime allocation</CardTitle>
            </div>
            <CpuIcon className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {ALLOCATION.map(([label]) => (
              <div className="flex flex-col gap-2" key={label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-sm font-semibold">
                    {label}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground/40">
                    —
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground/60 mt-2">
              Per-instance memory is configured on each instance.
            </p>
          </CardContent>
        </Card>

        {/* Interface toggles — real settings */}
        <Card className="min-h-80">
          <CardHeader className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
            <div>
              <CardDescription>Launcher</CardDescription>
              <CardTitle>Interface</CardTitle>
            </div>
            <SlidersHorizontalIcon className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {settingsHook.loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={`ss-${i}`} className="h-12 rounded-md" />
              ))
            ) : (
              <>
                {/* Theme */}
                <div className="flex flex-col gap-1.5 rounded-md border bg-background/45 p-3">
                  <Label className="text-muted-foreground text-sm font-semibold">
                    Theme
                  </Label>
                  <Select value={theme} onValueChange={(v) => v && handleTheme(v)}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Keep open after launch */}
                <div className="flex items-center justify-between gap-3 rounded-md border bg-background/45 p-3">
                  <span className="text-muted-foreground text-sm font-semibold">
                    Keep launcher open
                  </span>
                  <Switch
                    checked={keepOpen}
                    onCheckedChange={(checked) =>
                      settingsHook.updateSetting(
                        "launcher.keepOpenAfterLaunch",
                        checked,
                      )
                    }
                  />
                </div>

                {/* Show snapshots */}
                <div className="flex items-center justify-between gap-3 rounded-md border bg-background/45 p-3">
                  <span className="text-muted-foreground text-sm font-semibold">
                    Show snapshot builds
                  </span>
                  <Switch
                    checked={showSnapshots}
                    onCheckedChange={(checked) =>
                      settingsHook.updateSetting(
                        "launcher.showSnapshots",
                        checked,
                      )
                    }
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Storage paths — real directories */}
        <Card className="min-h-80">
          <CardHeader className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
            <div>
              <CardDescription>Paths</CardDescription>
              <CardTitle>Storage</CardTitle>
            </div>
            <FolderIcon className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {statusHook.loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`sp-${i}`} className="h-11 rounded-md" />
              ))
            ) : dirs ? (
              (
                [
                  [HardDriveIcon, "Root", dirs.root],
                  [HardDriveIcon, "Instances", dirs.instances],
                  [Volume2Icon, "Assets", dirs.assets],
                  [MonitorIcon, "Versions", dirs.versions],
                  [GaugeIcon, "Logs", dirs.logs],
                ] as const
              ).map(([Icon, label, path]) => (
                <div
                  key={label}
                  className="grid grid-cols-[1.75rem_4.5rem_minmax(0,1fr)] items-center gap-2 rounded-md border bg-background/45 p-3"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="text-muted-foreground text-sm font-semibold">
                    {label}
                  </span>
                  <strong
                    className="truncate text-right text-xs"
                    title={path}
                  >
                    {path}
                  </strong>
                </div>
              ))
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
