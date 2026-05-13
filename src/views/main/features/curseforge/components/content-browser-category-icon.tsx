import {
  BlocksIcon,
  ImageIcon,
  MapIcon,
  PackageIcon,
  SparklesIcon,
} from "lucide-react";
import type { BrowserCategory } from "@/views/main/features/curseforge/components/content-browser-dialog-model";

export function ContentBrowserCategoryIcon({
  category,
}: {
  category: BrowserCategory;
}) {
  if (category === "mods") return <BlocksIcon />;
  if (category === "modpacks") return <PackageIcon />;
  if (category === "resource-packs") return <ImageIcon />;
  if (category === "shaders") return <SparklesIcon />;

  return <MapIcon />;
}
