import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeftIcon,
  BoxesIcon,
  CpuIcon,
  DownloadIcon,
  FolderOpenIcon,
  HardDriveIcon,
  MemoryStickIcon,
  PackageCheckIcon,
  PlayIcon,
  PlugZapIcon,
  PuzzleIcon,
  RadioTowerIcon,
  ServerIcon,
  Settings2Icon,
  ShieldIcon,
  StarIcon,
} from "lucide-react";
import type { ElementType } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/views/main/components/ui/badge";
import { Button, buttonVariants } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/views/main/components/ui/empty";
import { Skeleton } from "@/views/main/components/ui/skeleton";
import { Switch } from "@/views/main/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/views/main/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/views/main/components/ui/tabs";
import {
  MODS,
  type ModEntry,
  SERVERS,
  type ServerEntry,
} from "@/views/main/features/catalog/catalog-data";
import { LaunchPlanSheet } from "@/views/main/features/instances/components/launch-plan-sheet";
import { useInstances } from "@/views/main/hooks/use-instances";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";
import type { LauncherInstance, LaunchPlan } from "../../../shared/types";

const INSTANCE_BLOCKS = Array.from(
  { length: 30 },
  (_, index) => `instance-info-block-${index}`,
);

function InstanceArtwork({ instance }: { instance: LauncherInstance }) {
  const toneByLoader: Record<LauncherInstance["loader"], string> = {
    fabric: "from-indigo-900 via-primary/30 to-background",
    forge: "from-amber-900 via-primary/20 to-background",
    neoforge: "from-orange-900 via-primary/20 to-background",
    quilt: "from-violet-900 via-secondary/40 to-background",
    vanilla: "from-emerald-900 via-primary/30 to-background",
  };

  return (
    <div
      className={cn(
        "relative h-56 overflow-hidden bg-linear-to-br",
        toneByLoader[instance.loader],
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--foreground)_8%,transparent)_0_1px,transparent_1px_20px)]" />
      <div className="absolute right-8 bottom-0 grid grid-cols-5 gap-1.5 opacity-80">
        {INSTANCE_BLOCKS.map((blockId) => (
          <span
            key={blockId}
            className="size-6 rounded-sm bg-background/35 shadow-sm"
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background/85 to-transparent" />
      <div className="absolute bottom-6 left-6">
        <Badge variant="secondary" className="capitalize">
          {instance.loader}
        </Badge>
      </div>
    </div>
  );
}

function InstanceMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <Icon className="size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-5">
      <Link
        to="/instances"
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        Library
      </Link>
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BoxesIcon />
          </EmptyMedia>
          <EmptyTitle>Instance not found</EmptyTitle>
          <EmptyDescription>
            This instance is no longer available in the local library.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/instances" />} nativeButton={false}>
            Back to Library
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-12 w-80" />
      <div className="grid grid-cols-[minmax(0,1fr)_22rem] gap-3 max-xl:grid-cols-1">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

function InstanceInfoPage() {
  const { instanceId } = Route.useParams();
  const instancesHook = useInstances();
  const instance =
    instancesHook.data?.find((item) => item.id === instanceId) ?? null;
  const [activePlan, setActivePlan] = useState<LaunchPlan | null>(null);
  const [enabled, setEnabled] = useState(
    () => new Set(MODS.filter((mod) => mod.enabled).map((mod) => mod.id)),
  );
  const [favorites, setFavorites] = useState(
    () =>
      new Set(
        SERVERS.filter((server) => server.favorite).map((server) => server.id),
      ),
  );
  const [mods, setMods] = useState<Array<ModEntry>>(() => MODS);
  const [planLoading, setPlanLoading] = useState(false);
  const [servers, setServers] = useState<Array<ServerEntry>>(() => SERVERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [updates, setUpdates] = useState(
    () =>
      new Set(MODS.filter((mod) => mod.updateAvailable).map((mod) => mod.id)),
  );

  const enabledMods = useMemo(
    () => mods.filter((mod) => enabled.has(mod.id)),
    [enabled, mods],
  );

  const onlineServers = useMemo(
    () => servers.filter((server) => server.status === "Online"),
    [servers],
  );

  async function handlePlay() {
    if (!instance) return;

    setPlanLoading(true);
    try {
      const plan = await rpc.requestProxy.createLaunchPlan({
        instanceId: instance.id,
      });
      setActivePlan(plan);
      setSheetOpen(true);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create launch plan",
      );
    } finally {
      setPlanLoading(false);
    }
  }

  const addMod = () => {
    const mod: ModEntry = {
      category: "Utility",
      enabled: false,
      id: "instance-local-minimap",
      name: "Instance Minimap",
      scope: "Client",
      summary: "A client utility staged directly on this instance.",
      updateAvailable: false,
      version: "1.0.0-local",
    };

    setMods((current) => {
      if (current.some((item) => item.id === mod.id)) {
        toast.message("Instance Minimap is already attached.");
        return current;
      }
      return [mod, ...current];
    });
    toast.success("Instance Minimap added disabled for review.");
  };

  const addServer = () => {
    const server: ServerEntry = {
      address: "instance.lan.local",
      favorite: false,
      id: "instance-lan",
      latencyMs: 18,
      name: "Instance LAN",
      players: "1 / 16",
      status: "Online",
      tags: ["LAN", instance?.loader ?? "Instance"],
      version: instance?.versionId ?? "Current",
    };

    setServers((current) => {
      if (current.some((item) => item.id === server.id)) {
        toast.message("Instance LAN is already attached.");
        return current;
      }
      return [server, ...current];
    });
    toast.success("Instance LAN added to this instance.");
  };

  const applyUpdate = (id: string, name: string) => {
    setUpdates((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    toast.success(`${name} marked up to date.`);
  };

  const refreshPings = () => {
    setServers((current) =>
      current.map((server, index) => ({
        ...server,
        latencyMs:
          server.status === "Online"
            ? 18 + (((server.latencyMs ?? 0) + index * 11) % 64)
            : null,
      })),
    );
    toast.success("Instance server pings refreshed.");
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMod = (id: string, name: string, checked: boolean) => {
    setEnabled((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    toast.success(
      `${name} ${checked ? "enabled" : "disabled"} for this instance.`,
    );
  };

  if (instancesHook.loading) return <LoadingState />;
  if (!instance) return <NotFoundState />;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <section className="flex items-end justify-between gap-4 max-lg:flex-col max-lg:items-start">
        <div className="max-w-3xl">
          <Link
            to="/instances"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Library
          </Link>
          <span className="mt-5 block text-muted-foreground text-xs font-black uppercase tracking-widest">
            Instance Info
          </span>
          <h1 className="mt-2 font-heading font-black text-4xl leading-none">
            {instance.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Manage launch settings, attached mods, and multiplayer servers from
            the instance context.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => toast.message(instance.gameDirectory)}
          >
            <FolderOpenIcon data-icon="inline-start" />
            Folder
          </Button>
          <Button disabled={planLoading} onClick={handlePlay}>
            <PlayIcon data-icon="inline-start" />
            {planLoading ? "Preparing" : "Play"}
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)_22rem] gap-3 max-xl:grid-cols-1">
        <Card className="pt-0">
          <InstanceArtwork instance={instance} />
          <CardHeader>
            <CardTitle>Launch Profile</CardTitle>
            <CardDescription>
              {instance.versionId} · {instance.loader}
              {instance.loaderVersion ? ` ${instance.loaderVersion}` : ""}
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">
                {instance.lastLaunchedAt
                  ? formatDistanceToNow(new Date(instance.lastLaunchedAt), {
                      addSuffix: true,
                    })
                  : "Never played"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
            <InstanceMetric
              icon={MemoryStickIcon}
              label="Memory"
              value={`${instance.memoryMinMb} / ${instance.memoryMaxMb} MB`}
            />
            <InstanceMetric
              icon={CpuIcon}
              label="Java"
              value={instance.javaExecutable ? "Custom" : "System default"}
            />
            <InstanceMetric
              icon={PuzzleIcon}
              label="Enabled Mods"
              value={String(enabledMods.length)}
            />
            <InstanceMetric
              icon={ServerIcon}
              label="Online Servers"
              value={String(onlineServers.length)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>Local checks before launch.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {[
              {
                icon: ShieldIcon,
                label: "Profile validation",
                value: instance.profileId ? "Profile linked" : "Select profile",
              },
              {
                icon: HardDriveIcon,
                label: "Game directory",
                value: "Inside launcher storage",
              },
              {
                icon: Settings2Icon,
                label: "Arguments",
                value: `${instance.javaArgs.length + instance.gameArgs.length} custom`,
              },
              {
                icon: PackageCheckIcon,
                label: "Mod loadout",
                value: `${enabledMods.length} enabled`,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-medium">
                      {item.label}
                    </span>
                  </div>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="mods">
        <TabsList>
          <TabsTrigger value="mods">
            <PuzzleIcon />
            Mods
          </TabsTrigger>
          <TabsTrigger value="servers">
            <ServerIcon />
            Servers
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Settings2Icon />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mods">
          <Card>
            <CardHeader>
              <CardTitle>Instance Mods</CardTitle>
              <CardDescription>
                Enable, disable, and update mods attached to {instance.name}.
              </CardDescription>
              <CardAction>
                <Button size="sm" onClick={addMod}>
                  <DownloadIcon data-icon="inline-start" />
                  Add Mod
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mod</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mods.map((mod) => {
                    const isEnabled = enabled.has(mod.id);
                    const hasUpdate = updates.has(mod.id);
                    return (
                      <TableRow key={mod.id}>
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <span className="font-semibold">{mod.name}</span>
                            <span className="max-w-xl truncate text-xs text-muted-foreground">
                              {mod.summary}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{mod.category}</TableCell>
                        <TableCell>{mod.scope}</TableCell>
                        <TableCell>
                          {hasUpdate ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => applyUpdate(mod.id, mod.name)}
                            >
                              <DownloadIcon data-icon="inline-start" />
                              Update
                            </Button>
                          ) : (
                            <Badge variant="secondary">{mod.version}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            aria-label={`${isEnabled ? "Disable" : "Enable"} ${mod.name}`}
                            checked={isEnabled}
                            onCheckedChange={(checked) =>
                              toggleMod(mod.id, mod.name, checked)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servers">
          <Card>
            <CardHeader>
              <CardTitle>Instance Servers</CardTitle>
              <CardDescription>
                Trusted multiplayer targets for this instance.
              </CardDescription>
              <CardAction className="flex gap-2">
                <Button variant="outline" size="sm" onClick={refreshPings}>
                  <RadioTowerIcon data-icon="inline-start" />
                  Refresh
                </Button>
                <Button size="sm" onClick={addServer}>
                  <ServerIcon data-icon="inline-start" />
                  Add Server
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servers.map((server) => {
                    const isFavorite = favorites.has(server.id);
                    return (
                      <TableRow key={server.id}>
                        <TableCell>
                          <div className="flex min-w-0 flex-col">
                            <span className="font-semibold">{server.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {server.address}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              server.status === "Online"
                                ? "default"
                                : server.status === "Maintenance"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {server.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{server.players}</TableCell>
                        <TableCell>{server.version}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant={isFavorite ? "secondary" : "ghost"}
                              size="icon-sm"
                              aria-label={
                                isFavorite
                                  ? "Remove from favorites"
                                  : "Add to favorites"
                              }
                              onClick={() => toggleFavorite(server.id)}
                            >
                              <StarIcon
                                className={cn(isFavorite && "fill-current")}
                              />
                            </Button>
                            <Button
                              size="sm"
                              disabled={server.status !== "Online"}
                              onClick={() =>
                                toast.success(
                                  `${server.name} selected for ${instance.name}.`,
                                )
                              }
                            >
                              <PlugZapIcon data-icon="inline-start" />
                              Use
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Storage and Arguments</CardTitle>
              <CardDescription>
                Instance-level launch metadata and local paths.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
              <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Game Directory
                </div>
                <div className="mt-1 truncate font-mono text-xs">
                  {instance.gameDirectory}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Icon Source
                </div>
                <div className="mt-1 truncate font-mono text-xs">
                  {instance.iconUrl ?? "Generated from loader"}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  JVM Arguments
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {instance.javaArgs.length} custom
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Game Arguments
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {instance.gameArgs.length} custom
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Created{" "}
                {formatDistanceToNow(new Date(instance.createdAt), {
                  addSuffix: true,
                })}
              </span>
              <Badge variant="outline">
                Updated{" "}
                {formatDistanceToNow(new Date(instance.updatedAt), {
                  addSuffix: true,
                })}
              </Badge>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <LaunchPlanSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        plan={activePlan}
      />
    </div>
  );
}

export const Route = createFileRoute("/instances_/$instanceId")({
  component: InstanceInfoPage,
});
