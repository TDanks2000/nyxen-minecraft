import { formatDistanceToNow } from "date-fns";
import {
  DownloadIcon,
  PlugZapIcon,
  PuzzleIcon,
  RadioTowerIcon,
  ServerIcon,
  Settings2Icon,
  StarIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { LauncherInstance } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
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
  return (
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
              <Button size="sm" onClick={onAddMod}>
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
                          <span className="max-w-xl truncate text-muted-foreground text-xs">
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
                            onClick={() => onApplyUpdate(mod.id, mod.name)}
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
                            onToggleMod(mod.id, mod.name, checked)
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
                          <span className="text-muted-foreground text-xs">
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
                            onClick={() => onToggleFavorite(server.id)}
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
              <div className="font-semibold text-muted-foreground text-xs">
                Game Directory
              </div>
              <div className="mt-1 truncate font-mono text-xs">
                {instance.gameDirectory}
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="font-semibold text-muted-foreground text-xs">
                Icon Source
              </div>
              <div className="mt-1 truncate font-mono text-xs">
                {instance.iconUrl ?? "Generated from loader"}
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="font-semibold text-muted-foreground text-xs">
                JVM Arguments
              </div>
              <div className="mt-1 font-semibold text-sm">
                {instance.javaArgs.length} custom
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="font-semibold text-muted-foreground text-xs">
                Game Arguments
              </div>
              <div className="mt-1 font-semibold text-sm">
                {instance.gameArgs.length} custom
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <span className="text-muted-foreground text-xs">
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
