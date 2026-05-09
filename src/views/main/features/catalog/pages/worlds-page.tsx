import {
  ArchiveIcon,
  CloudUploadIcon,
  FolderPlusIcon,
  GlobeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/views/main/components/ui/tabs";
import {
  WORLDS,
  type WorldEntry,
} from "@/views/main/features/catalog/catalog-data";
import {
  LibraryPageHeader,
  MetricCard,
  MiniStat,
  PageEmpty,
  SearchBox,
} from "@/views/main/features/catalog/page-primitives";

type WorldFilter = "Adventure" | "all" | "Creative" | "Survival";

export function WorldsPage() {
  const [filter, setFilter] = useState<WorldFilter>("all");
  const [query, setQuery] = useState("");
  const [worlds, setWorlds] = useState<Array<WorldEntry>>(() => WORLDS);
  const [backupCounts, setBackupCounts] = useState(
    () => new Map(WORLDS.map((world) => [world.id, world.backups])),
  );

  const filteredWorlds = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return worlds.filter((world) => {
      const matchesFilter = filter === "all" || world.gameMode === filter;
      const matchesQuery =
        needle.length === 0 ||
        [world.name, world.gameMode, world.difficulty, world.seed, world.status]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query, worlds]);

  const totalBackups = [...backupCounts.values()].reduce(
    (total, count) => total + count,
    0,
  );

  const createBackup = (id: string, name: string) => {
    setBackupCounts((current) => {
      const next = new Map(current);
      next.set(id, (next.get(id) ?? 0) + 1);
      return next;
    });
    toast.success(`${name} backup created.`);
  };

  const importWorld = () => {
    const importedWorld: WorldEntry = {
      backups: 1,
      difficulty: "Normal",
      gameMode: "Survival",
      id: "imported-expedition",
      lastPlayed: "Imported now",
      name: "Imported Expedition",
      seed: "local-import",
      size: "128 MB",
      status: "Backed up",
    };

    setWorlds((current) => {
      if (current.some((world) => world.id === importedWorld.id)) {
        toast.message("Imported Expedition already exists.");
        return current;
      }
      return [importedWorld, ...current];
    });
    setBackupCounts((current) => {
      const next = new Map(current);
      next.set(importedWorld.id, importedWorld.backups);
      return next;
    });
    toast.success("Imported Expedition added to worlds.");
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <LibraryPageHeader
        eyebrow="Saves"
        title="Worlds"
        description="Review local worlds, create fast backups, and keep save health visible before you launch."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast.success("World folder scan completed.")}
            >
              <ArchiveIcon data-icon="inline-start" />
              Scan Saves
            </Button>
            <Button onClick={importWorld}>
              <FolderPlusIcon data-icon="inline-start" />
              Import World
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        <MetricCard
          icon={GlobeIcon}
          label="Worlds"
          value={String(worlds.length)}
          caption="Detected across managed instances."
        />
        <MetricCard
          icon={ShieldCheckIcon}
          label="Backups"
          value={String(totalBackups)}
          caption="Restore points tracked by the launcher."
        />
        <MetricCard
          icon={CloudUploadIcon}
          label="Sync"
          value="Ready"
          caption="No remote writes are performed until sync is enabled."
        />
      </section>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as WorldFilter)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {(
              ["all", "Survival", "Creative", "Adventure"] as Array<WorldFilter>
            ).map((value) => (
              <TabsTrigger key={value} value={value}>
                {value === "all" ? "All" : value}
              </TabsTrigger>
            ))}
          </TabsList>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search worlds, seeds, modes..."
          />
        </div>

        <TabsContent value={filter}>
          {filteredWorlds.length === 0 ? (
            <PageEmpty
              icon={GlobeIcon}
              title="No worlds found"
              description="Change the mode filter or search text to find another save."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
              {filteredWorlds.map((world) => {
                const backups = backupCounts.get(world.id) ?? world.backups;
                return (
                  <Card key={world.id}>
                    <CardHeader>
                      <CardTitle>{world.name}</CardTitle>
                      <CardDescription>
                        {world.gameMode} · {world.difficulty} ·{" "}
                        {world.lastPlayed}
                      </CardDescription>
                      <CardAction>
                        <Badge
                          variant={
                            world.status === "Needs backup"
                              ? "destructive"
                              : world.status === "Syncing"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {world.status}
                        </Badge>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                      <MiniStat label="Size" value={world.size} />
                      <MiniStat label="Backups" value={String(backups)} />
                      <MiniStat label="Seed" value={world.seed} />
                      <MiniStat
                        label="Mode"
                        value={world.gameMode}
                        variant="outline"
                      />
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <SparklesIcon className="size-4 text-primary" />
                        Save metadata verified locally
                      </div>
                      <Button
                        size="sm"
                        onClick={() => createBackup(world.id, world.name)}
                      >
                        <ArchiveIcon data-icon="inline-start" />
                        Backup
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
