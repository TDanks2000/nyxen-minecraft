import { Badge } from "@/views/main/components/ui/badge";
import { ContentBrowserCategoryIcon } from "@/views/main/features/curseforge/components/content-browser-category-icon";
import type { BrowserCategory } from "@/views/main/features/curseforge/components/content-browser-dialog-model";
import type { SelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-types";
import { cn } from "@/views/main/lib/utils";

type ContentBrowserCategoryRailProps = {
  activeCategory: BrowserCategory;
  categories: Array<{
    description: string;
    label: string;
    value: BrowserCategory;
  }>;
  getInstalledCount: (category: BrowserCategory) => number;
  isCategoryAvailable: (
    category: BrowserCategory,
    selectedInstance: SelectedInstance | null,
  ) => boolean;
  onCategoryChange: (category: BrowserCategory) => void;
  selectedInstance: SelectedInstance | null;
};

export function ContentBrowserCategoryRail({
  activeCategory,
  categories,
  getInstalledCount,
  isCategoryAvailable,
  onCategoryChange,
  selectedInstance,
}: ContentBrowserCategoryRailProps) {
  return (
    <nav className="flex min-h-0 flex-col gap-1 p-2">
      {categories.map((category) => {
        const active = category.value === activeCategory;
        const installedCount = getInstalledCount(category.value);
        const disabled = !isCategoryAvailable(category.value, selectedInstance);

        return (
          <button
            aria-disabled={disabled}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left transition-colors",
              active
                ? "border-primary/35 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
            )}
            disabled={disabled}
            key={category.value}
            onClick={() => onCategoryChange(category.value)}
            title={
              disabled
                ? "Modpacks create new instances and cannot be installed into the selected instance."
                : undefined
            }
            type="button"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
                active && "bg-primary text-primary-foreground",
              )}
            >
              <ContentBrowserCategoryIcon category={category.value} />
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate font-semibold text-sm">
                {category.label}
              </span>
              {installedCount > 0 ? (
                <Badge variant={active ? "default" : "outline"}>
                  {installedCount}
                </Badge>
              ) : null}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
