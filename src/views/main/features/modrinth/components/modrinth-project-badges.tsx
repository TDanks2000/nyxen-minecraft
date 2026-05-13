import type { ModrinthCategory, ModrinthProjectSummary } from "@/shared/types";
import { Badge } from "@/views/main/components/ui/badge";
import {
  getModrinthCategoryLabel,
  getVisibleModrinthMinecraftVersions,
  type InstalledModrinthItem,
} from "@/views/main/features/modrinth/modrinth-browser-model";

type ModrinthProjectBadgesProps = {
  category: ModrinthCategory;
  installedItem: InstalledModrinthItem | null;
  item: ModrinthProjectSummary;
};

export function ModrinthProjectBadges({
  category,
  installedItem,
  item,
}: ModrinthProjectBadgesProps) {
  const versions = getVisibleModrinthMinecraftVersions(item, 3);
  const loaders = item.modLoaders.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">{getModrinthCategoryLabel(category)}</Badge>
      <Badge variant="outline">Modrinth</Badge>
      {installedItem ? <Badge variant="default">Installed</Badge> : null}
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
