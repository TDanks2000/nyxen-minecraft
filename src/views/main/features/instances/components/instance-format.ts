import { formatDistanceToNow } from "date-fns";
import type { ModLoader } from "@/shared/types";

export const LOADER_LABELS: Record<ModLoader, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
  vanilla: "Vanilla",
};

export function formatInstanceLastPlayed(
  value: string | null,
  options: { prefix?: boolean } = {},
): string {
  if (!value) return "Never played";

  const relative = formatDistanceToNow(new Date(value), { addSuffix: true });
  return options.prefix ? `Played ${relative}` : relative;
}
