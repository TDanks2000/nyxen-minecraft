import {
  CopyIcon,
  FolderOpenIcon,
  ImageIcon,
  ImagesIcon,
  RefreshCcwIcon,
  StarIcon,
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
  formatEntrySize,
  formatRelativeDate,
  type LocalScreenshotEntry,
  mapLocalScreenshots,
  toFileMediaUrl,
} from "@/views/main/features/catalog/catalog-model";
import {
  LibraryPageHeader,
  PageEmpty,
  SearchBox,
} from "@/views/main/features/catalog/page-primitives";
import { useInstanceContentStore } from "@/views/main/features/instances/hooks/use-instance-content-store";
import { useRendererMediaUrl } from "@/views/main/features/instances/hooks/use-renderer-media-url";
import { useInstances } from "@/views/main/hooks/use-instances";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";

type ScreenshotFilter = "all" | "favorites" | "recent";

const recentCutoffMs = 14 * 24 * 60 * 60 * 1000;

function ScreenshotPreview({
  screenshot,
}: {
  screenshot: LocalScreenshotEntry;
}) {
  const imageUrl = useRendererMediaUrl(screenshot.imageUrl);

  return (
    <div className="relative aspect-video overflow-hidden rounded-t-[inherit] bg-muted/35">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <ImageIcon className="size-8 text-muted-foreground/45" />
        </div>
      )}
    </div>
  );
}

export function ScreenshotsPage() {
  const instancesHook = useInstances();
  const byInstanceId = useInstanceContentStore((state) => state.byInstanceId);
  const errors = useInstanceContentStore((state) => state.errors);
  const loadingIds = useInstanceContentStore((state) => state.loadingIds);
  const refreshManyInstanceContents = useInstanceContentStore(
    (state) => state.refreshManyInstanceContents,
  );
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<ScreenshotFilter>("all");
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

  const screenshots = useMemo(
    () => mapLocalScreenshots(instances, byInstanceId),
    [byInstanceId, instances],
  );
  const contentLoading =
    instances.some((instance) => loadingIds[instance.id]) ||
    (instances.length > 0 &&
      instances.some(
        (instance) => !byInstanceId[instance.id] && !errors[instance.id],
      ));

  const filteredScreenshots = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const now = Date.now();

    return screenshots.filter((screenshot) => {
      const modifiedTime = new Date(screenshot.modifiedAt).getTime();
      const matchesFilter =
        filter === "all" ||
        (filter === "favorites" && favorites.has(screenshot.id)) ||
        (filter === "recent" &&
          !Number.isNaN(modifiedTime) &&
          now - modifiedTime <= recentCutoffMs);
      const matchesQuery =
        needle.length === 0 ||
        [
          screenshot.name,
          screenshot.instance.name,
          screenshot.instance.versionId,
          screenshot.file.fileName,
          screenshot.path,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [deferredQuery, favorites, filter, screenshots]);

  const toggleFavorite = (id: string, name: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        toast.message(`${name} removed from favorites.`);
      } else {
        next.add(id);
        toast.success(`${name} added to favorites.`);
      }
      return next;
    });
  };

  const refreshScreenshots = async () => {
    if (instanceIds.length === 0) {
      toast.message("Create an instance before scanning screenshots.");
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

    toast.success("Screenshot folders scanned.");
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
        eyebrow="Media"
        title="Screenshots"
        description="Browse screenshots found in managed instance folders."
        actions={
          <Button
            variant="outline"
            onClick={() => void refreshScreenshots()}
            disabled={contentLoading}
          >
            <RefreshCcwIcon
              data-icon="inline-start"
              className={contentLoading ? "animate-spin" : undefined}
            />
            {contentLoading ? "Scanning" : "Scan"}
          </Button>
        }
      />

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as ScreenshotFilter)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search screenshots, instances, paths..."
          />
        </div>

        <TabsContent value={filter}>
          {instancesHook.loading || contentLoading ? (
            <PageEmpty
              icon={RefreshCcwIcon}
              title="Scanning screenshots"
              description="Screenshots will appear as soon as local image metadata is available."
            />
          ) : filteredScreenshots.length === 0 ? (
            <PageEmpty
              icon={ImagesIcon}
              title="No screenshots found"
              description="Capture screenshots in Minecraft, then scan again."
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3">
              {filteredScreenshots.map((screenshot) => {
                const isFavorite = favorites.has(screenshot.id);
                return (
                  <Card key={screenshot.id} className="pt-0">
                    <ScreenshotPreview screenshot={screenshot} />
                    <CardHeader>
                      <CardTitle>{screenshot.name}</CardTitle>
                      <CardDescription>
                        {screenshot.instance.name} ·{" "}
                        {formatRelativeDate(screenshot.modifiedAt)}
                      </CardDescription>
                      <CardAction>
                        <Button
                          variant={isFavorite ? "secondary" : "ghost"}
                          size="icon-sm"
                          aria-label={
                            isFavorite ? "Remove favorite" : "Add favorite"
                          }
                          onClick={() =>
                            toggleFavorite(screenshot.id, screenshot.name)
                          }
                        >
                          <StarIcon
                            className={cn(isFavorite && "fill-current")}
                          />
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">
                          {screenshot.file.extension ?? "image"}
                        </Badge>
                        <Badge variant="secondary">
                          {formatEntrySize(screenshot.file)}
                        </Badge>
                        <Badge variant="outline">
                          Minecraft {screenshot.instance.versionId}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {screenshot.path}
                      </p>
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <span className="min-w-0 truncate text-xs text-muted-foreground">
                        {screenshot.file.fileName}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Copy path for ${screenshot.name}`}
                          onClick={() =>
                            void copyPath(screenshot.path, screenshot.name)
                          }
                        >
                          <CopyIcon />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            void revealPath(screenshot.path, screenshot.name)
                          }
                        >
                          <FolderOpenIcon data-icon="inline-start" />
                          Reveal
                        </Button>
                      </div>
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
