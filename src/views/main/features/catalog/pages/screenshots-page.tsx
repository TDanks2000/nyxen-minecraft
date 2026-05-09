import {
  CameraIcon,
  CopyIcon,
  FolderOpenIcon,
  ImageIcon,
  ImagesIcon,
  StarIcon,
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
  SCREENSHOTS,
  type ScreenshotEntry,
} from "@/views/main/features/catalog/catalog-data";
import {
  LibraryPageHeader,
  MetricCard,
  PageEmpty,
  SearchBox,
} from "@/views/main/features/catalog/page-primitives";
import { cn } from "@/views/main/lib/utils";

type ScreenshotFilter = "all" | "favorites" | "recent";

const SCREENSHOT_PREVIEW_BLOCKS = Array.from(
  { length: 24 },
  (_, index) => `screenshot-preview-block-${index}`,
);

function ScreenshotPreview({ index }: { index: number }) {
  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden bg-gradient-to-br",
        index % 4 === 0 && "from-primary/70 via-card to-background",
        index % 4 === 1 &&
          "from-[var(--chart-2)]/70 via-muted/60 to-background",
        index % 4 === 2 && "from-[var(--chart-3)]/70 via-card to-background",
        index % 4 === 3 &&
          "from-[var(--chart-4)]/70 via-secondary/40 to-background",
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-background/70" />
      <div className="absolute right-4 bottom-6 grid grid-cols-4 gap-1 opacity-70">
        {SCREENSHOT_PREVIEW_BLOCKS.map((blockId) => (
          <span
            key={blockId}
            className="size-4 rounded-[2px] bg-foreground/10"
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_24%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_38%)]" />
    </div>
  );
}

export function ScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<Array<ScreenshotEntry>>(
    () => SCREENSHOTS,
  );
  const [favorites, setFavorites] = useState(
    () =>
      new Set(
        SCREENSHOTS.filter((screenshot) => screenshot.favorite).map(
          (screenshot) => screenshot.id,
        ),
      ),
  );
  const [filter, setFilter] = useState<ScreenshotFilter>("all");
  const [query, setQuery] = useState("");

  const filteredScreenshots = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return screenshots.filter((screenshot, index) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "favorites" && favorites.has(screenshot.id)) ||
        (filter === "recent" && index < 2);
      const matchesQuery =
        needle.length === 0 ||
        [
          screenshot.name,
          screenshot.instance,
          screenshot.world,
          screenshot.resolution,
          ...screenshot.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [favorites, filter, query, screenshots]);

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

  const captureScreenshot = () => {
    const screenshot: ScreenshotEntry = {
      captured: "Captured now",
      favorite: false,
      id: "fresh-capture",
      instance: "Current Instance",
      name: "Fresh capture",
      path: "instances/current/screenshots/fresh-capture.png",
      resolution: "2560 x 1440",
      tags: ["Fresh", "Local"],
      world: "Active World",
    };

    setScreenshots((current) => {
      if (current.some((item) => item.id === screenshot.id)) {
        toast.message("Fresh capture already exists.");
        return current;
      }
      return [screenshot, ...current];
    });
    toast.success("Fresh capture added to the gallery.");
  };

  const copyPath = async (path: string, name: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(`${name} path copied.`);
    } catch {
      toast.error("Clipboard is unavailable in this view.");
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <LibraryPageHeader
        eyebrow="Media"
        title="Screenshots"
        description="Browse captured moments across instances, favorite useful references, and reveal local file paths quickly."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast.success("Screenshot folders scanned.")}
            >
              <ImagesIcon data-icon="inline-start" />
              Scan
            </Button>
            <Button onClick={captureScreenshot}>
              <CameraIcon data-icon="inline-start" />
              Capture
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        <MetricCard
          icon={ImageIcon}
          label="Screenshots"
          value={String(screenshots.length)}
          caption="Indexed from managed instance folders."
        />
        <MetricCard
          icon={StarIcon}
          label="Favorites"
          value={String(favorites.size)}
          caption="Reference shots pinned for quick retrieval."
        />
        <MetricCard
          icon={FolderOpenIcon}
          label="Storage"
          value="Local"
          caption="No media leaves disk without explicit sync."
        />
      </section>

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
            placeholder="Search screenshots, worlds, tags..."
          />
        </div>

        <TabsContent value={filter}>
          {filteredScreenshots.length === 0 ? (
            <PageEmpty
              icon={CameraIcon}
              title="No screenshots found"
              description="Change the search or tab filter to show more captures."
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
              {filteredScreenshots.map((screenshot, index) => {
                const isFavorite = favorites.has(screenshot.id);
                return (
                  <Card key={screenshot.id} className="pt-0">
                    <ScreenshotPreview index={index} />
                    <CardHeader>
                      <CardTitle>{screenshot.name}</CardTitle>
                      <CardDescription>
                        {screenshot.world} · {screenshot.captured}
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
                        {screenshot.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {screenshot.path}
                      </p>
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        {screenshot.instance} · {screenshot.resolution}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label="Copy path"
                          onClick={() =>
                            copyPath(screenshot.path, screenshot.name)
                          }
                        >
                          <CopyIcon />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            toast.success(`${screenshot.name} revealed.`)
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
