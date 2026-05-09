import {
  BoxesIcon,
  DownloadIcon,
  FilterIcon,
  HardDriveDownloadIcon,
  PackagePlusIcon,
  RefreshCcwIcon,
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
  MODPACKS,
  type Modpack,
} from "@/views/main/features/catalog/catalog-data";
import {
  LibraryPageHeader,
  MetricCard,
  PageEmpty,
  SearchBox,
} from "@/views/main/features/catalog/page-primitives";
import { cn } from "@/views/main/lib/utils";

type ModpackCategory = "adventure" | "all" | "featured" | "performance";

const CATEGORY_LABELS: Record<ModpackCategory, string> = {
  adventure: "Adventure",
  all: "All",
  featured: "Featured",
  performance: "Performance",
};

const MODPACK_ART_BLOCKS = Array.from(
  { length: 18 },
  (_, index) => `modpack-art-block-${index}`,
);

function ModpackArt({ index }: { index: number }) {
  return (
    <div
      className={cn(
        "relative h-36 overflow-hidden bg-gradient-to-br",
        index % 3 === 0 && "from-primary/80 via-primary/20 to-card",
        index % 3 === 1 && "from-[var(--chart-2)]/70 via-primary/20 to-card",
        index % 3 === 2 && "from-[var(--chart-3)]/70 via-secondary/30 to-card",
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--foreground)_10%,transparent)_0_1px,transparent_1px_18px)]" />
      <div className="absolute right-5 bottom-0 grid grid-cols-3 gap-1 opacity-70">
        {MODPACK_ART_BLOCKS.map((blockId) => (
          <span
            key={blockId}
            className="size-5 rounded-sm bg-background/45 shadow-sm"
          />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 h-16 w-2/3 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}

export function ModpacksPage() {
  const [catalogPacks, setCatalogPacks] = useState<Array<Modpack>>(
    () => MODPACKS,
  );
  const [category, setCategory] = useState<ModpackCategory>("all");
  const [favorites, setFavorites] = useState(() => new Set(["valhelsia-six"]));
  const [installed, setInstalled] = useState(
    () =>
      new Set(MODPACKS.filter((pack) => pack.installed).map((pack) => pack.id)),
  );
  const [query, setQuery] = useState("");

  const filteredPacks = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return catalogPacks.filter((pack) => {
      const matchesCategory = category === "all" || pack.category === category;
      const matchesQuery =
        needle.length === 0 ||
        [pack.name, pack.loader, pack.minecraft, pack.summary, ...pack.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return matchesCategory && matchesQuery;
    });
  }, [catalogPacks, category, query]);

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

  const toggleInstall = (id: string, name: string) => {
    setInstalled((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        toast.message(`${name} is already installed.`);
        return current;
      }
      next.add(id);
      toast.success(`${name} added to your library.`);
      return next;
    });
  };

  const importPack = () => {
    const importedPack: Modpack = {
      category: "featured",
      downloads: "Local",
      id: "imported-local-pack",
      installed: true,
      loader: "Fabric",
      minecraft: "1.21.5",
      name: "Imported Local Pack",
      performance: "Balanced",
      summary:
        "A locally imported profile staged from a pack manifest on disk.",
      tags: ["Local", "Manifest", "Custom"],
      updated: "Imported now",
    };

    setCatalogPacks((current) => {
      if (current.some((pack) => pack.id === importedPack.id)) {
        toast.message("Imported Local Pack is already in the catalog.");
        return current;
      }
      return [importedPack, ...current];
    });
    setInstalled((current) => new Set(current).add(importedPack.id));
    toast.success("Imported Local Pack added to your library.");
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-5">
      <LibraryPageHeader
        eyebrow="Discover"
        title="Modpacks"
        description="Browse curated packs, compare loader requirements, and stage installs without leaving the launcher."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast.success("Modpack catalog refreshed.")}
            >
              <RefreshCcwIcon data-icon="inline-start" />
              Refresh
            </Button>
            <Button onClick={importPack}>
              <PackagePlusIcon data-icon="inline-start" />
              Import Pack
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        <MetricCard
          icon={BoxesIcon}
          label="Catalog"
          value={`${catalogPacks.length} packs`}
          caption="Local curated set ready for fast browsing."
        />
        <MetricCard
          icon={HardDriveDownloadIcon}
          label="Installed"
          value={String(installed.size)}
          caption="Packs already staged in your launcher library."
        />
        <MetricCard
          icon={FilterIcon}
          label="Loaders"
          value="4 supported"
          caption="Fabric, Forge, NeoForge, and Quilt profiles."
        />
      </section>

      <Tabs
        value={category}
        onValueChange={(value) => setCategory(value as ModpackCategory)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {(Object.keys(CATEGORY_LABELS) as Array<ModpackCategory>).map(
              (key) => (
                <TabsTrigger key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </TabsTrigger>
              ),
            )}
          </TabsList>
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search packs, tags, versions..."
          />
        </div>

        <TabsContent value={category}>
          {filteredPacks.length === 0 ? (
            <PageEmpty
              icon={BoxesIcon}
              title="No modpacks found"
              description="Adjust the search or switch categories to find compatible packs."
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
              {filteredPacks.map((pack, index) => {
                const isInstalled = installed.has(pack.id);
                const isFavorite = favorites.has(pack.id);

                return (
                  <Card key={pack.id} className="pt-0">
                    <ModpackArt index={index} />
                    <CardHeader>
                      <CardTitle>{pack.name}</CardTitle>
                      <CardDescription>
                        {pack.minecraft} · {pack.loader} · {pack.updated}
                      </CardDescription>
                      <CardAction>
                        <Button
                          variant={isFavorite ? "secondary" : "ghost"}
                          size="icon-sm"
                          aria-label={
                            isFavorite ? "Remove favorite" : "Add favorite"
                          }
                          onClick={() => toggleFavorite(pack.id)}
                        >
                          <StarIcon
                            className={cn(isFavorite && "fill-current")}
                          />
                        </Button>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {pack.summary}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {pack.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">
                          {pack.downloads} downloads
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pack.performance}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isInstalled ? "secondary" : "default"}
                        onClick={() => toggleInstall(pack.id, pack.name)}
                      >
                        <DownloadIcon data-icon="inline-start" />
                        {isInstalled ? "Installed" : "Install"}
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
