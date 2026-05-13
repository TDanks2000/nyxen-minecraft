import {
  Grid2X2Icon,
  ListIcon,
  RefreshCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import type { CurseForgeSortField, ModrinthSortField } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/views/main/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { Switch } from "@/views/main/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/views/main/components/ui/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/views/main/components/ui/toggle-group";
import type {
  BrowserCategory,
  LoaderFilter,
} from "@/views/main/features/curseforge/components/content-browser-dialog-model";
import {
  CURSEFORGE_LOADER_OPTIONS,
  CURSEFORGE_SORT_OPTIONS,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import type {
  ContentBrowserSource,
  CurseForgeBrowserViewMode,
  SelectedInstance,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import {
  MODRINTH_LOADER_OPTIONS,
  MODRINTH_SORT_OPTIONS,
} from "@/views/main/features/modrinth/modrinth-browser-model";

type BrowserCategoryInfo = {
  description: string;
  label: string;
  value: BrowserCategory;
};

type ContentBrowserFilterBarProps = {
  activeCategory: BrowserCategory;
  activeCategoryInfo: BrowserCategoryInfo;
  activeCategories: Array<BrowserCategoryInfo>;
  activeInstance: SelectedInstance | null;
  activeSource: ContentBrowserSource;
  activeSourceLabel: string;
  curseForgeSortField: CurseForgeSortField;
  filtersOpen: boolean;
  installedOnly: boolean;
  isActiveCategoryAvailable: (
    category: BrowserCategory,
    instance: SelectedInstance | null,
  ) => boolean;
  loader: LoaderFilter;
  loaderFilterEnabled: boolean;
  minecraftVersion: string;
  modrinthSortField: ModrinthSortField;
  onCategoryChange: (category: BrowserCategory) => void;
  onCurseForgeSortFieldChange: (field: CurseForgeSortField) => void;
  onFiltersOpenChange: (open: boolean) => void;
  onInstalledOnlyChange: (installedOnly: boolean) => void;
  onLoaderChange: (loader: LoaderFilter) => void;
  onMinecraftVersionChange: (version: string) => void;
  onModrinthSortFieldChange: (field: ModrinthSortField) => void;
  onQueryChange: (query: string) => void;
  onRefresh: () => void;
  onViewModeChange: (mode: CurseForgeBrowserViewMode) => void;
  query: string;
  viewMode: CurseForgeBrowserViewMode;
};

export function ContentBrowserFilterBar({
  activeCategory,
  activeCategoryInfo,
  activeCategories,
  activeInstance,
  activeSource,
  activeSourceLabel,
  curseForgeSortField,
  filtersOpen,
  installedOnly,
  isActiveCategoryAvailable,
  loader,
  loaderFilterEnabled,
  minecraftVersion,
  modrinthSortField,
  onCategoryChange,
  onCurseForgeSortFieldChange,
  onFiltersOpenChange,
  onInstalledOnlyChange,
  onLoaderChange,
  onMinecraftVersionChange,
  onModrinthSortFieldChange,
  onQueryChange,
  onRefresh,
  onViewModeChange,
  query,
  viewMode,
}: ContentBrowserFilterBarProps) {
  return (
    <div className="border-b border-border bg-background/95 px-4 py-3 sm:px-5">
      <Tabs
        className="lg:hidden"
        onValueChange={(value) => onCategoryChange(value as BrowserCategory)}
        value={activeCategory}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {activeCategories.map((category) => {
            const disabled = !isActiveCategoryAvailable(
              category.value,
              activeInstance,
            );

            return (
              <TabsTrigger
                disabled={disabled}
                key={category.value}
                title={
                  disabled
                    ? "Modpacks create new instances and cannot be installed into the selected instance."
                    : undefined
                }
                value={category.value}
              >
                {category.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="mt-3 flex min-w-0 flex-col gap-2 lg:mt-0">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-heading font-semibold">
              {activeCategoryInfo.label}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              aria-expanded={filtersOpen}
              onClick={() => onFiltersOpenChange(!filtersOpen)}
              size="sm"
              variant={filtersOpen ? "secondary" : "outline"}
            >
              <SlidersHorizontalIcon data-icon="inline-start" />
              Filters
            </Button>
            <Button
              aria-label={`Refresh ${activeSourceLabel} results`}
              onClick={onRefresh}
              size="icon-sm"
              title="Refresh"
              variant="outline"
            >
              <RefreshCcwIcon />
            </Button>
            <ToggleGroup
              aria-label="View mode"
              onValueChange={(value) => {
                const nextMode = value[0] as
                  | CurseForgeBrowserViewMode
                  | undefined;
                if (nextMode) onViewModeChange(nextMode);
              }}
              value={[viewMode]}
            >
              <ToggleGroupItem
                aria-label="Grid view"
                type="button"
                value="grid"
              >
                <Grid2X2Icon />
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="List view"
                type="button"
                value="list"
              >
                <ListIcon />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <InputGroup className="h-9">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label={`Search ${activeSourceLabel}`}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search projects, authors, categories..."
            value={query}
          />
        </InputGroup>

        {filtersOpen ? (
          <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-card/45 p-2 md:grid-cols-2 xl:grid-cols-[9rem_9rem_10rem_12rem]">
            <InputGroup className="h-9">
              <InputGroupAddon>
                <span className="text-xs">MC</span>
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Minecraft version"
                onChange={(event) =>
                  onMinecraftVersionChange(event.target.value)
                }
                placeholder="All versions"
                value={minecraftVersion}
              />
            </InputGroup>

            <Select
              disabled={!loaderFilterEnabled}
              onValueChange={(value) => onLoaderChange(value as LoaderFilter)}
              value={loader}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All loaders</SelectItem>
                  {(activeSource === "curseforge"
                    ? CURSEFORGE_LOADER_OPTIONS
                    : MODRINTH_LOADER_OPTIONS
                  ).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) => {
                if (activeSource === "curseforge") {
                  onCurseForgeSortFieldChange(value as CurseForgeSortField);
                } else {
                  onModrinthSortFieldChange(value as ModrinthSortField);
                }
              }}
              value={
                activeSource === "curseforge"
                  ? curseForgeSortField
                  : modrinthSortField
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(activeSource === "curseforge"
                    ? CURSEFORGE_SORT_OPTIONS
                    : MODRINTH_SORT_OPTIONS
                  ).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="flex h-9 min-w-0 items-center justify-between gap-2 rounded-lg border border-input px-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <SlidersHorizontalIcon className="size-3.5" />
                Installed
              </div>
              <Switch
                checked={installedOnly}
                disabled={!activeInstance}
                onCheckedChange={onInstalledOnlyChange}
                size="sm"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
