import type { ModLoader } from "@/shared/types";
import { formatRelativeTime } from "@/views/main/lib/date-format";

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

  const relative = formatRelativeTime(value);
  return options.prefix ? `Played ${relative}` : relative;
}
