import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
} from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import {
  getCurseForgeCategoryLabel,
  getVisibleMinecraftVersions,
  requiresManualCurseForgeDownload,
} from "@/views/main/features/curseforge/curseforge-browser-model";
import type { InstalledCurseForgeItem } from "@/views/main/features/curseforge/curseforge-browser-types";

type CurseForgeProjectBadgesProps = {
  category: CurseForgeCategory;
  installedItem: InstalledCurseForgeItem | null;
  item: CurseForgeProjectSummary;
};

export function CurseForgeProjectBadges({
  category,
  installedItem,
  item,
}: CurseForgeProjectBadgesProps) {
  const versions = getVisibleMinecraftVersions(item, 3);
  const loaders = item.modLoaders.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{getCurseForgeCategoryLabel(category)}</Badge>
      {installedItem ? <Badge variant="default">Installed</Badge> : null}
      {requiresManualCurseForgeDownload(item) ? (
        <Badge variant="outline">Manual download</Badge>
      ) : null}
      {versions.map((version) => (
        <Badge key={version} variant="outline">
          {version}
        </Badge>
      ))}
      {loaders.map((loader) => (
        <Badge key={loader} variant="outline">
          {loader}
        </Badge>
      ))}
    </div>
  );
}
