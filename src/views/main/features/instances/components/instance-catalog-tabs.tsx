import { formatDistanceToNow } from "date-fns";
import {
  DownloadIcon,
  FolderTreeIcon,
  HardDriveIcon,
  PlugZapIcon,
  PuzzleIcon,
  RadioTowerIcon,
  ServerIcon,
  Settings2Icon,
  SignalIcon,
  SlidersHorizontalIcon,
  StarIcon,
  TerminalSquareIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { LauncherInstance } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { Switch } from "@/views/main/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/views/main/components/ui/tabs";
import type {
  ModEntry,
  ServerEntry,
} from "@/views/main/features/catalog/catalog-data";
import { cn } from "@/views/main/lib/utils";

type InstanceCatalogTabsProps = {
  enabled: Set<string>;
  favorites: Set<string>;
  instance: LauncherInstance;
  mods: Array<ModEntry>;
  onAddMod: () => void;
  onAddServer: () => void;
  onApplyUpdate: (id: string, name: string) => void;
  onRefreshPings: () => void;
  onToggleFavorite: (id: string) => void;
  onToggleMod: (id: string, name: string, checked: boolean) => void;
  servers: Array<ServerEntry>;
  updates: Set<string>;
};

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3 text-primary" />
        {label}
      </div>
      <div className="mt-1 font-heading text-lg font-black leading-none">
        {value}
      </div>
    </div>
  );
}

function ModRow({
  enabled,
  hasUpdate,
  mod,
  onApplyUpdate,
  onToggleMod,
}: {
  enabled: boolean;
  hasUpdate: boolean;
  mod: ModEntry;
  onApplyUpdate: (id: string, name: string) => void;
  onToggleMod: (id: string, name: string, checked: boolean) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/60 bg-background/55 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate font-heading text-sm font-semibold">
            {mod.name}
          </h3>
          {hasUpdate && <Badge variant="default">Update ready</Badge>}
          <Badge variant={enabled ? "secondary" : "outline"}>
            {enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
          {mod.summary}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="outline">{mod.category}</Badge>
          <Badge variant="outline">{mod.scope}</Badge>
          <Badge variant="ghost">{mod.version}</Badge>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 md:min-w-36">
        {hasUpdate && (
          <Button size="sm" variant="outline" onClick={() => onApplyUpdate(mod.id, mod.name)}>
            <DownloadIcon data-icon="inline-start" />
            Update
          </Button>
        )}
        <Switch
          aria-label={`${enabled ? "Disable" : "Enable"} ${mod.name}`}
          checked={enabled}
          onCheckedChange={(checked) => onToggleMod(mod.id, mod.name, checked)}
        />
      </div>
    </div>
  );
}

function ServerRow({
  favorite,
  instanceName,
  onToggleFavorite,
  server,
}: {
  favorite: boolean;
  instanceName: string;
  onToggleFavorite: (id: string) => void;
  server: ServerEntry;
}) {
  const online = server.status === "Online";

  return (
    <div className="grid gap-3 rounded-lg border border-border/60 bg-background/55 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate font-heading text-sm font-semibold">
            {server.name}
          </h3>
          <Badge
            variant={
              server.status === "Online"
                ? "secondary"
                : server.status === "Maintenance"
                  ? "outline"
                  : "destructive"
            }
          >
            {server.status}
          </Badge>
          {favorite && <Badge variant="default">Favorite</Badge>}
        </div>
        <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {server.address}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{server.players}</span> players
          </span>
          <span>
            <span className="font-semibold text-foreground">
              {server.latencyMs === null ? "—" : `${server.latencyMs} ms`}
            </span>{" "}
            latency
          </span>
          <span>
            <span className="font-semibold text-foreground">{server.version}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 md:min-w-28">
        <Button
          variant={favorite ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => onToggleFavorite(server.id)}
        >
          <StarIcon className={cn(favorite && "fill-current")} />
        </Button>
        <Button
          size="sm"
          disabled={!online}
          onClick={() => toast.success(`${server.name} selected for ${instanceName}.`)}
        >
          <PlugZapIcon data-icon="inline-start" />
          Use
        </Button>
      </div>
    </div>
  );
}

function OverviewTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0 text-primary" />
        {label}
      </div>
      <div className="mt-1.5 truncate font-mono text-xs">{value}</div>
    </div>
  );
}

export function InstanceCatalogTabs({
  enabled,
  favorites,
  instance,
  mods,
  onAddMod,
  onAddServer,
  onApplyUpdate,
  onRefreshPings,
  onToggleFavorite,
  onToggleMod,
  servers,
  updates,
}: InstanceCatalogTabsProps) {
  const enabledCount = mods.filter((mod) => enabled.has(mod.id)).length;
  const updateCount = mods.filter((mod) => updates.has(mod.id)).length;
  const onlineCount = servers.filter((s) => s.status === "Online").length;
  const favoriteCount = servers.filter((s) => favorites.has(s.id)).length;

  return (
    <Tabs defaultValue="mods" className="min-w-0">
      <TabsList className="mb-1">
        <TabsTrigger value="mods">
          <PuzzleIcon />
          Mods
        </TabsTrigger>
        <TabsTrigger value="servers">
          <ServerIcon />
          Servers
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings2Icon />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="mods">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Mods</CardTitle>
            <CardAction>
              <Button size="sm" onClick={onAddMod}>
                <DownloadIcon data-icon="inline-start" />
                Add Mod
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 max-md:grid-cols-1">
              <StatChip icon={PuzzleIcon} label="Attached" value={String(mods.length)} />
              <StatChip icon={SlidersHorizontalIcon} label="Enabled" value={String(enabledCount)} />
              <StatChip icon={DownloadIcon} label="Updates" value={String(updateCount)} />
            </div>
            {mods.length > 0 ? (
              <div className="flex flex-col gap-2">
                {mods.map((mod) => (
                  <ModRow
                    key={mod.id}
                    enabled={enabled.has(mod.id)}
                    hasUpdate={updates.has(mod.id)}
                    mod={mod}
                    onApplyUpdate={onApplyUpdate}
                    onToggleMod={onToggleMod}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No mods attached to this instance.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="servers">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Servers</CardTitle>
            <CardAction className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRefreshPings}>
                <RadioTowerIcon data-icon="inline-start" />
                Refresh
              </Button>
              <Button size="sm" onClick={onAddServer}>
                <ServerIcon data-icon="inline-start" />
                Add Server
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 max-md:grid-cols-1">
              <StatChip icon={SignalIcon} label="Online" value={String(onlineCount)} />
              <StatChip icon={StarIcon} label="Favorites" value={String(favoriteCount)} />
              <StatChip icon={ServerIcon} label="Total" value={String(servers.length)} />
            </div>
            {servers.length > 0 ? (
              <div className="flex flex-col gap-2">
                {servers.map((server) => (
                  <ServerRow
                    key={server.id}
                    favorite={favorites.has(server.id)}
                    instanceName={instance.name}
                    onToggleFavorite={onToggleFavorite}
                    server={server}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No servers saved for this instance.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
            <OverviewTile
              icon={HardDriveIcon}
              label="Game directory"
              value={instance.gameDirectory}
            />
            <OverviewTile
              icon={FolderTreeIcon}
              label="Instance root"
              value={instance.instanceDirectory}
            />
            <OverviewTile
              icon={TerminalSquareIcon}
              label="JVM arguments"
              value={
                instance.javaArgs.length > 0
                  ? instance.javaArgs.join(" ")
                  : "None"
              }
            />
            <OverviewTile
              icon={Settings2Icon}
              label="Game arguments"
              value={
                instance.gameArgs.length > 0
                  ? instance.gameArgs.join(" ")
                  : "None"
              }
            />
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3">
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
  );
}
