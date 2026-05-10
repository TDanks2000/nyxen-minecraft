import { Link } from "@tanstack/react-router";
import {
  BoxesIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FilterIcon,
  Globe2Icon,
  HardDriveDownloadIcon,
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
  CurseForgeProjectSummary,
  CurseForgeStatus,
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
  MetricCard,
  PageEmpty,
  SearchBox,
} from "@/views/main/features/catalog/page-primitives";
import {
  formatCurseForgeDate,
  formatCurseForgeDownloads,
  getVisibleMinecraftVersions,
  MINECRAFT_VERSION_PATTERN,
  requiresManualCurseForgeDownload,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import { useCurseForgeInstall } from "@/views/main/features/curseforge/use-curseforge-install";
import { useRendererMediaUrl } from "@/views/main/features/instances/hooks/use-renderer-media-url";
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

type CurseForgeModpackCard = {
  downloads: string;
  id: string;
  imageUrl: string | null;
  installed: false;
  kind: "curseforge";
  loader: string;
  minecraft: string;
  name: string;
  project: CurseForgeProjectSummary;
  searchText: string;
  summary: string;
  tags: Array<string>;
  updatedLabel: string;
};

type ModpackCardItem = InstalledModpackCard | CurseForgeModpackCard;

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

const getProjectMinecraftVersion = (
  project: CurseForgeProjectSummary,
): string =>
  getVisibleMinecraftVersions(project, 1)[0] ??
  project.gameVersions.find((version) =>
    MINECRAFT_VERSION_PATTERN.test(version),
  ) ??
  "Version varies";

const getProjectLoader = (project: CurseForgeProjectSummary): string =>
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

const createCurseForgeCard = (
  project: CurseForgeProjectSummary,
): CurseForgeModpackCard => {
  const minecraft = getProjectMinecraftVersion(project);
  const loader = getProjectLoader(project);
  const tags =
    project.categories.length > 0
      ? project.categories.slice(0, 3)
      : ["CurseForge"];

  return {
    downloads: formatCurseForgeDownloads(project.downloadCount),
    id: `curseforge:${project.id}`,
    imageUrl: project.screenshotUrls[0] ?? project.logoUrl,
    installed: false,
    kind: "curseforge",
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
    summary: project.summary || "CurseForge modpack.",
    tags,
    updatedLabel: formatCurseForgeDate(project.dateModified),
  };
};

export function ModpacksPage() {
  const instancesHook = useInstances();
  const [curseForgeProjects, setCurseForgeProjects] = useState<
    Array<CurseForgeProjectSummary>
  >([]);
  const [curseForgeStatus, setCurseForgeStatus] =
    useState<CurseForgeStatus | null>(null);
  const [curseForgeError, setCurseForgeError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<ModpackFilter>("all");
  const [installingProjectIds, setInstallingProjectIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");
  const [refreshingCurseForge, setRefreshingCurseForge] = useState(false);
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
  const curseForgeInstall = useCurseForgeInstall({
    onInstanceCreated: instancesHook.upsertInstance,
  });

  const loadCurseForgeCatalog = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      setRefreshingCurseForge(true);
      setCurseForgeError(null);

      try {
        const status = await rpc.requestProxy.getCurseForgeStatus(null);
        setCurseForgeStatus(status);

        if (!status.configured) {
          setCurseForgeProjects([]);
          if (!quiet) {
            toast.error("Set NYXEN_CURSEFORGE_API_KEY to load live modpacks.");
          }
          return;
        }

        const result = await rpc.requestProxy.searchCurseForgeProjects({
          pageSize: 24,
          section: "modpacks",
          sortField: "downloads",
          sortOrder: "desc",
        });
        setCurseForgeProjects(result.data);

        if (!quiet) {
          toast.success(`Loaded ${result.data.length} CurseForge modpacks.`);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load CurseForge modpacks.";
        setCurseForgeError(message);
        if (!quiet) toast.error(message);
      } finally {
        setRefreshingCurseForge(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadCurseForgeCatalog({ quiet: true });
  }, [loadCurseForgeCatalog]);

  const cards = useMemo<Array<ModpackCardItem>>(() => {
    const installedCards = installedModpacks.map(createInstalledCard);
    const availableCards = curseForgeProjects
      .filter((project) => !installedProjectIds.has(String(project.id)))
      .map(createCurseForgeCard);

    return [...installedCards, ...availableCards];
  }, [curseForgeProjects, installedModpacks, installedProjectIds]);

  const filteredCards = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "installed" && card.kind === "installed") ||
        (filter === "available" && card.kind === "curseforge");
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

  const installProject = async (project: CurseForgeProjectSummary) => {
    setInstallingProjectIds((current) => new Set(current).add(project.id));

    try {
      if (requiresManualCurseForgeDownload(project)) {
        await curseForgeInstall.openManualDownload({
          category: "modpacks",
          instance: null,
          item: project,
        });
        return;
      }

      await curseForgeInstall.installModpack({
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
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <LibraryPageHeader
        eyebrow="Discover"
        title="Modpacks"
        description="Browse installed modpacks and live CurseForge modpack results."
        actions={
          <Button
            variant="outline"
            onClick={() => void loadCurseForgeCatalog()}
            disabled={refreshingCurseForge}
          >
            {refreshingCurseForge ? (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            ) : (
              <RefreshCcwIcon data-icon="inline-start" />
            )}
            {refreshingCurseForge ? "Refreshing" : "Refresh"}
          </Button>
        }
      />

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        <MetricCard
          icon={BoxesIcon}
          label="Live Catalog"
          value={`${curseForgeProjects.length} packs`}
          caption={
            curseForgeStatus?.configured
              ? "Loaded from CurseForge search."
              : "CurseForge API key is not configured."
          }
        />
        <MetricCard
          icon={HardDriveDownloadIcon}
          label="Installed"
          value={String(installedModpacks.length)}
          caption="Modpacks linked to local launcher instances."
        />
        <MetricCard
          icon={curseForgeStatus?.configured ? Globe2Icon : FilterIcon}
          label="CurseForge"
          value={curseForgeStatus?.configured ? "Connected" : "Not configured"}
          caption={curseForgeError ?? "Live results are loaded through RPC."}
        />
      </section>

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
          {instancesHook.loading || refreshingCurseForge ? (
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
                curseForgeStatus?.configured
                  ? "Adjust the search or refresh the live catalog."
                  : "Install a modpack instance or configure CurseForge search."
              }
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
              {filteredCards.map((card) => {
                const isFavorite = favorites.has(card.id);
                const installing =
                  card.kind === "curseforge" &&
                  installingProjectIds.has(card.project.id);
                const needsManualDownload =
                  card.kind === "curseforge" &&
                  requiresManualCurseForgeDownload(card.project);

                return (
                  <Card key={card.id} className="pt-0">
                    <ModpackArtwork imageUrl={card.imageUrl} />
                    <CardHeader>
                      <CardTitle>{card.name}</CardTitle>
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
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">
                          {card.kind === "installed"
                            ? card.entry.instance.name
                            : `${card.downloads} downloads`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {card.kind === "installed"
                            ? `Installed ${formatRelativeDate(card.entry.installedAt)}`
                            : card.project.authors.join(", ") || "CurseForge"}
                        </div>
                      </div>
                      {card.kind === "installed" ? (
                        <Link
                          to="/instances/$instanceId"
                          params={{ instanceId: card.entry.instanceId }}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Open
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void installProject(card.project)}
                          disabled={
                            installing ||
                            !card.project.latestFile ||
                            card.project.isAvailable === false
                          }
                          variant={needsManualDownload ? "outline" : "default"}
                        >
                          {installing ? (
                            <Loader2Icon
                              data-icon="inline-start"
                              className="animate-spin"
                            />
                          ) : needsManualDownload ? (
                            <ExternalLinkIcon data-icon="inline-start" />
                          ) : (
                            <DownloadIcon data-icon="inline-start" />
                          )}
                          {installing
                            ? "Installing"
                            : needsManualDownload
                              ? "Download"
                              : "Install"}
                        </Button>
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
