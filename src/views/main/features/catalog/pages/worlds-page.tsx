import {
  CopyIcon,
  FolderOpenIcon,
  GlobeIcon,
  RefreshCcwIcon,
  ServerIcon,
  TimerIcon,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
  formatAbsoluteDate,
  formatEntrySize,
  formatRelativeDate,
  getContentList,
  getLatestContentRefresh,
  mapLocalWorlds,
  toFileMediaUrl,
} from "@/views/main/features/catalog/catalog-model";
import {
  LibraryPageHeader,
  MetricCard,
  MiniStat,
  PageEmpty,
  SearchBox,
} from "@/views/main/features/catalog/page-primitives";
import { useInstanceContentStore } from "@/views/main/features/instances/hooks/use-instance-content-store";
import { useInstances } from "@/views/main/hooks/use-instances";
import { rpc } from "@/views/main/lib/rpc";

type WorldFilter = "all" | "archives" | "directories" | "recent";

const WORLD_FILTER_LABELS: Record<WorldFilter, string> = {
  all: "All",
  archives: "Archives",
  directories: "Folders",
  recent: "Recent",
};

const recentCutoffMs = 7 * 24 * 60 * 60 * 1000;

export function WorldsPage() {
  const instancesHook = useInstances();
  const byInstanceId = useInstanceContentStore((state) => state.byInstanceId);
  const errors = useInstanceContentStore((state) => state.errors);
  const loadingIds = useInstanceContentStore((state) => state.loadingIds);
  const refreshManyInstanceContents = useInstanceContentStore(
    (state) => state.refreshManyInstanceContents,
  );
  const [filter, setFilter] = useState<WorldFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const instances = instancesHook.data ?? [];
  const instanceIds = useMemo(
    () => instances.map((instance) => instance.id),
    [instances],
  );

  useEffect(() => {
    if (instancesHook.data === null || instanceIds.length === 0) return;

    void refreshManyInstanceContents(instanceIds);
  }, [instanceIds, instancesHook.data, refreshManyInstanceContents]);

  const contents = useMemo(
    () => getContentList(instances, byInstanceId),
    [byInstanceId, instances],
  );
  const worlds = useMemo(
    () => mapLocalWorlds(instances, byInstanceId),
    [byInstanceId, instances],
  );
  const latestRefresh = useMemo(
    () => getLatestContentRefresh(contents),
    [contents],
  );
  const contentLoading =
    instances.some((instance) => loadingIds[instance.id]) ||
    (instances.length > 0 &&
      instances.some(
        (instance) => !byInstanceId[instance.id] && !errors[instance.id],
      ));
  const errorCount = instances.filter((instance) => errors[instance.id]).length;

  const filteredWorlds = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const now = Date.now();

    return worlds.filter((world) => {
      const modifiedTime = new Date(world.modifiedAt).getTime();
      const matchesFilter =
        filter === "all" ||
        (filter === "recent" &&
          !Number.isNaN(modifiedTime) &&
          now - modifiedTime <= recentCutoffMs) ||
        (filter === "directories" && world.type === "directory") ||
        (filter === "archives" && world.type === "archive");
      const matchesQuery =
        needle.length === 0 ||
        [
          world.name,
          world.instance.name,
          world.instance.versionId,
          world.instance.loader,
          world.file.fileName,
          world.path,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [deferredQuery, filter, worlds]);

  const refreshWorlds = async () => {
    if (instanceIds.length === 0) {
      toast.message("Create an instance before scanning saves.");
      return;
    }

    const scanned = await refreshManyInstanceContents(instanceIds);
    const failedCount = Math.max(0, instanceIds.length - scanned.length);

    if (failedCount > 0) {
      toast.warning(
        `${failedCount} instance${failedCount === 1 ? "" : "s"} could not be scanned.`,
      );
      return;
    }

    toast.success("Save folders scanned.");
  };

  const copyPath = async (path: string, name: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(`${name} path copied.`);
    } catch {
      toast.error("Clipboard is unavailable in this view.");
    }
  };

  const revealPath = async (path: string, name: string) => {
    try {
      const result = await rpc.requestProxy.openExternal({
        url: toFileMediaUrl(path),
      });

      if (!result.opened) {
        throw new Error("The path could not be opened.");
      }

      toast.success(`${name} opened.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Path unavailable.");
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col gap-5 p-4 sm:p-6">
      <LibraryPageHeader
        eyebrow="Saves"
        title="Worlds"
        description="Review worlds found in managed instance save folders."
        actions={
          <Button
            variant="outline"
            onClick={() => void refreshWorlds()}
            disabled={contentLoading}
          >
            <RefreshCcwIcon
              data-icon="inline-start"
              className={contentLoading ? "animate-spin" : undefined}
            />
            {contentLoading ? "Scanning" : "Scan Saves"}
          </Button>
        }
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-3">
        <MetricCard
          icon={GlobeIcon}
          label="Worlds"
          value={String(worlds.length)}
          caption="Detected from managed instance save folders."
        />
        <MetricCard
          icon={ServerIcon}
          label="Instances"
          value={String(instances.length)}
          caption="Instances included in the latest save scan."
        />
        <MetricCard
          icon={TimerIcon}
          label="Last Scan"
          value={latestRefresh ? formatRelativeDate(latestRefresh) : "Pending"}
          caption={
            errorCount > 0
              ? `${errorCount} instance${errorCount === 1 ? "" : "s"} could not be scanned.`
              : "Folder metadata comes from local disk."
          }
        />
      </section>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as WorldFilter)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {(Object.keys(WORLD_FILTER_LABELS) as Array<WorldFilter>).map(
              (value) => (
                <TabsTrigger key={value} value={value}>
                  {WORLD_FILTER_LABELS[value]}
                </TabsTrigger>
              ),
            )}
          </TabsList>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search worlds, instances, paths..."
          />
        </div>

        <TabsContent value={filter}>
          {instancesHook.loading || contentLoading ? (
            <PageEmpty
              icon={RefreshCcwIcon}
              title="Scanning save folders"
              description="Worlds will appear as soon as local folder metadata is available."
            />
          ) : filteredWorlds.length === 0 ? (
            <PageEmpty
              icon={GlobeIcon}
              title="No worlds found"
              description="Create or import a world in an instance save folder, then scan again."
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(24rem,1fr))] gap-3">
              {filteredWorlds.map((world) => (
                <Card key={world.id}>
                  <CardHeader>
                    <CardTitle>{world.name}</CardTitle>
                    <CardDescription>
                      {world.instance.name} ·{" "}
                      {formatRelativeDate(world.modifiedAt)}
                    </CardDescription>
                    <CardAction>
                      <Badge
                        variant={
                          world.type === "archive" ? "outline" : "secondary"
                        }
                      >
                        {world.type === "archive" ? "Archive" : "Folder"}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                    <MiniStat
                      label="Instance"
                      value={world.instance.name}
                      variant="outline"
                    />
                    <MiniStat
                      label="Size"
                      value={formatEntrySize(world.file)}
                    />
                    <MiniStat
                      label="Modified"
                      value={formatAbsoluteDate(world.modifiedAt)}
                    />
                    <MiniStat
                      label="Version"
                      value={world.instance.versionId}
                      variant="outline"
                    />
                  </CardContent>
                  <CardFooter className="justify-between gap-3">
                    <p className="min-w-0 truncate text-xs text-muted-foreground">
                      {world.path}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Copy path for ${world.name}`}
                        onClick={() => void copyPath(world.path, world.name)}
                      >
                        <CopyIcon />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void revealPath(world.path, world.name)}
                      >
                        <FolderOpenIcon data-icon="inline-start" />
                        Reveal
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
