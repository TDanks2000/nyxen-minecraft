import { Link } from "@tanstack/react-router";
import {
  BoxesIcon,
  DownloadIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PackageIcon,
  RefreshCcwIcon,
  StarIcon,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import type {
  CurseForgeStatus,
  ModrinthProjectSummary,
  ModrinthStatus,
} from "@/shared/types";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/views/main/components/ui/tabs";
import {
  formatRelativeDate,
  type InstalledModpackEntry,
  LOADER_LABELS,
  mapInstalledModpacks,
} from "@/views/main/features/catalog/catalog-model";
import {
  LibraryPageHeader,
  PageEmpty,
  SearchBox,
} from "@/views/main/features/catalog/page-primitives";
import {
  formatCurseForgeDate,
  formatCurseForgeDownloads,
  MINECRAFT_VERSION_PATTERN,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import { useRendererMediaUrl } from "@/views/main/features/instances/hooks/use-renderer-media-url";
import { useModrinthInstall } from "@/views/main/features/modrinth/use-modrinth-install";
import { useInstances } from "@/views/main/hooks/use-instances";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";

type ModpackFilter = "all" | "available" | "installed";

type InstalledModpackCard = {
  entry: InstalledModpackEntry;
  id: string;
  imageUrl: string | null;
  installed: true;
  kind: "installed";
  loader: string;
  minecraft: string;
  name: string;
  searchText: string;
  summary: string;
  tags: Array<string>;
  updatedLabel: string;
};

type ModrinthModpackCard = {
  downloads: string;
  id: string;
  imageUrl: string | null;
  installed: false;
  kind: "modrinth";
  loader: string;
  minecraft: string;
  name: string;
  project: ModrinthProjectSummary;
  searchText: string;
  summary: string;
  tags: Array<string>;
  updatedLabel: string;
};

type ModpackCardItem = InstalledModpackCard | ModrinthModpackCard;

function ModpackArtwork({ imageUrl }: { imageUrl: string | null }) {
  const resolvedUrl = useRendererMediaUrl(imageUrl);

  return (
    <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-t-[inherit] bg-muted/35">
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <PackageIcon className="size-9 text-muted-foreground/45" />
      )}
    </div>
  );
}

const getProjectMinecraftVersion = (project: ModrinthProjectSummary): string =>
  [...(project.latestFile?.gameVersions ?? []), ...project.gameVersions].find(
    (version) => MINECRAFT_VERSION_PATTERN.test(version),
  ) ??
  project.gameVersions.find((version) =>
    MINECRAFT_VERSION_PATTERN.test(version),
  ) ??
  "Version varies";

const getProjectLoader = (project: ModrinthProjectSummary): string =>
  project.modLoaders[0]
    ? (LOADER_LABELS[project.modLoaders[0]] ?? "Loader varies")
    : "Loader varies";

const createInstalledCard = (
  entry: InstalledModpackEntry,
): InstalledModpackCard => {
  const summary = `Installed as ${entry.instance.name}.`;

  return {
    entry,
    id: entry.id,
    imageUrl: entry.imageUrl,
    installed: true,
    kind: "installed",
    loader: LOADER_LABELS[entry.loader],
    minecraft: entry.minecraft,
    name: entry.name,
    searchText: [
      entry.name,
      entry.instance.name,
      entry.minecraft,
      entry.loader,
      entry.version ?? "",
      entry.projectId,
      ...entry.tags,
    ]
      .join(" ")
      .toLowerCase(),
    summary,
    tags: entry.tags,
    updatedLabel: formatRelativeDate(entry.updatedAt),
  };
};

const createModrinthCard = (
  project: ModrinthProjectSummary,
): ModrinthModpackCard => {
  const minecraft = getProjectMinecraftVersion(project);
  const loader = getProjectLoader(project);
  const tags =
    project.categories.length > 0
      ? project.categories.slice(0, 3)
      : ["Modrinth"];

  return {
    downloads: formatCurseForgeDownloads(project.downloadCount),
    id: `modrinth:${project.id}`,
    imageUrl: project.screenshotUrls[0] ?? project.logoUrl,
    installed: false,
    kind: "modrinth",
    loader,
    minecraft,
    name: project.name,
    project,
    searchText: [
      project.name,
      project.summary,
      minecraft,
      loader,
      project.slug,
      ...project.categories,
      ...project.authors,
      ...project.gameVersions,
    ]
      .join(" ")
      .toLowerCase(),
    summary: project.summary || "Modrinth modpack.",
    tags,
    updatedLabel: formatCurseForgeDate(project.dateModified),
  };
};

export function ModpacksPage() {
  const instancesHook = useInstances();
  const [modrinthProjects, setModrinthProjects] = useState<
    Array<ModrinthProjectSummary>
  >([]);
  const [modrinthStatus, setModrinthStatus] = useState<ModrinthStatus | null>(
    null,
  );
  const [curseForgeStatus, setCurseForgeStatus] =
    useState<CurseForgeStatus | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<ModpackFilter>("all");
  const [installingProjectIds, setInstallingProjectIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");
  const [refreshingModrinth, setRefreshingModrinth] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const instances = instancesHook.data ?? [];
  const installedModpacks = useMemo(
    () => mapInstalledModpacks(instances),
    [instances],
  );
  const installedProjectIds = useMemo(
    () => new Set(installedModpacks.map((pack) => pack.projectId)),
    [installedModpacks],
  );
  const modrinthInstall = useModrinthInstall({
    onInstanceCreated: instancesHook.upsertInstance,
  });

  const loadModrinthCatalog = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      setRefreshingModrinth(true);

      try {
        const [curseForgeStatusResult, modrinthStatusResult] =
          await Promise.all([
            rpc.requestProxy.getCurseForgeStatus(null),
            rpc.requestProxy.getModrinthStatus(null),
          ]);
        setCurseForgeStatus(curseForgeStatusResult);
        setModrinthStatus(modrinthStatusResult);

        if (!modrinthStatusResult.configured) {
          setModrinthProjects([]);
          if (!quiet) {
            toast.error("Modrinth catalog search is unavailable.");
          }
          return;
        }

        const result = await rpc.requestProxy.searchModrinthProjects({
          pageSize: 24,
          section: "modpacks",
          sortField: "downloads",
        });
        setModrinthProjects(result.data);

        if (!quiet) {
          toast.success(`Loaded ${result.data.length} Modrinth modpacks.`);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load Modrinth modpacks.";
        if (!quiet) toast.error(message);
      } finally {
        setRefreshingModrinth(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadModrinthCatalog({ quiet: true });
  }, [loadModrinthCatalog]);

  const cards = useMemo<Array<ModpackCardItem>>(() => {
    const installedCards = installedModpacks.map(createInstalledCard);
    const availableCards = modrinthProjects
      .filter((project) => !installedProjectIds.has(String(project.id)))
      .map(createModrinthCard);

    return [...installedCards, ...availableCards];
  }, [modrinthProjects, installedModpacks, installedProjectIds]);

  const filteredCards = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "installed" && card.kind === "installed") ||
        (filter === "available" && card.kind === "modrinth");
      const matchesQuery = !needle || card.searchText.includes(needle);

      return matchesFilter && matchesQuery;
    });
  }, [cards, deferredQuery, filter]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const installProject = async (project: ModrinthProjectSummary) => {
    setInstallingProjectIds((current) => new Set(current).add(project.id));

    try {
      await modrinthInstall.installModpack({
        category: "modpacks",
        item: project,
      });
    } finally {
      setInstallingProjectIds((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col gap-5 p-4 sm:p-6">
      <LibraryPageHeader
        eyebrow="Discover"
        title="Modpacks"
        description="Manage installed modpack instances first, then install new packs. Sources: CurseForge and Modrinth."
        actions={
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={curseForgeStatus?.configured ? "secondary" : "outline"}
              >
                CurseForge{" "}
                {curseForgeStatus
                  ? curseForgeStatus.configured
                    ? "ready"
                    : "needs key"
                  : "checking"}
              </Badge>
              <Badge
                variant={modrinthStatus?.configured ? "secondary" : "outline"}
              >
                Modrinth {modrinthStatus?.configured ? "ready" : "checking"}
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => void loadModrinthCatalog()}
              disabled={refreshingModrinth}
            >
              {refreshingModrinth ? (
                <Loader2Icon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <RefreshCcwIcon data-icon="inline-start" />
              )}
              {refreshingModrinth ? "Refreshing" : "Refresh"}
            </Button>
          </>
        }
      />

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as ModpackFilter)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
          </TabsList>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search packs, authors, versions..."
          />
        </div>

        <TabsContent value={filter}>
          {instancesHook.loading || refreshingModrinth ? (
            <PageEmpty
              icon={RefreshCcwIcon}
              title="Loading modpacks"
              description="Installed instances and live catalog entries are being loaded."
            />
          ) : filteredCards.length === 0 ? (
            <PageEmpty
              icon={BoxesIcon}
              title="No modpacks found"
              description={
                modrinthStatus?.configured
                  ? "Adjust the search or refresh the live catalog."
                  : "Install a modpack instance or try again later."
              }
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3">
              {filteredCards.map((card) => {
                const isFavorite = favorites.has(card.id);
                const installing =
                  card.kind === "modrinth" &&
                  installingProjectIds.has(card.project.id);

                return (
                  <Card key={card.id} className="pt-0">
                    <ModpackArtwork imageUrl={card.imageUrl} />
                    <CardHeader>
                      <div className="flex min-w-0 items-start gap-2">
                        <CardTitle className="min-w-0 flex-1 truncate">
                          {card.name}
                        </CardTitle>
                        <Badge variant={card.installed ? "default" : "outline"}>
                          {card.installed ? "Installed" : "Available"}
                        </Badge>
                      </div>
                      <CardDescription>
                        Minecraft {card.minecraft} · {card.loader} ·{" "}
                        {card.updatedLabel}
                      </CardDescription>
                      <CardAction>
                        <Button
                          variant={isFavorite ? "secondary" : "ghost"}
                          size="icon-sm"
                          aria-label={
                            isFavorite ? "Remove favorite" : "Add favorite"
                          }
                          onClick={() => toggleFavorite(card.id)}
                        >
                          <StarIcon
                            className={cn(isFavorite && "fill-current")}
                          />
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {card.summary}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {card.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {isFavorite ? (
                        <p className="text-muted-foreground text-xs">
                          Favorite is saved for this session only.
                        </p>
                      ) : null}
                    </CardContent>
                    <CardFooter className="flex-wrap justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">
                          {card.kind === "installed"
                            ? card.entry.instance.name
                            : `${card.downloads} downloads`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {card.kind === "installed"
                            ? `Installed ${formatRelativeDate(card.entry.installedAt)}`
                            : card.project.authors.join(", ") || "Modrinth"}
                        </div>
                      </div>
                      {card.kind === "installed" ? (
                        <Link
                          to="/instances/$instanceId"
                          params={{ instanceId: card.entry.instanceId }}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Manage Instance
                        </Link>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {card.project.websiteUrl ? (
                            <a
                              className={buttonVariants({
                                size: "sm",
                                variant: "outline",
                              })}
                              href={card.project.websiteUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <ExternalLinkIcon data-icon="inline-start" />
                              Source
                            </a>
                          ) : null}
                          <Button
                            size="sm"
                            onClick={() => void installProject(card.project)}
                            disabled={
                              installing ||
                              !card.project.latestFile ||
                              card.project.isAvailable === false
                            }
                          >
                            {installing ? (
                              <Loader2Icon
                                data-icon="inline-start"
                                className="animate-spin"
                              />
                            ) : (
                              <DownloadIcon data-icon="inline-start" />
                            )}
                            {installing ? "Installing" : "Install as Instance"}
                          </Button>
                        </div>
                      )}
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
