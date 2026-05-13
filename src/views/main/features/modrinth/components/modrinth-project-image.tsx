import { PackageIcon } from "lucide-react";
import type { ModrinthCategory, ModrinthProjectSummary } from "@/shared/types";
import { getModrinthCategoryLabel } from "@/views/main/features/modrinth/modrinth-browser-model";

type ModrinthProjectImageProps = {
  category: ModrinthCategory;
  item: ModrinthProjectSummary;
};

export function ModrinthProjectImage({
  category,
  item,
}: ModrinthProjectImageProps) {
  if (item.logoUrl) {
    return (
      <img
        alt=""
        className="size-14 rounded-md object-cover ring-1 ring-border"
        src={item.logoUrl}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border"
    >
      <PackageIcon />
      <span className="sr-only">{getModrinthCategoryLabel(category)}</span>
    </div>
  );
}
