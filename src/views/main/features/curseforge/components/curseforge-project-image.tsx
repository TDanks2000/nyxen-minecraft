import { PackageIcon } from "lucide-react";
import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
} from "@/shared/types";
import { getCurseForgeCategoryLabel } from "@/views/main/features/curseforge/curseforge-browser-model";

type CurseForgeProjectImageProps = {
  category: CurseForgeCategory;
  item: CurseForgeProjectSummary;
};

export function CurseForgeProjectImage({
  category,
  item,
}: CurseForgeProjectImageProps) {
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
      <span className="sr-only">{getCurseForgeCategoryLabel(category)}</span>
    </div>
  );
}
