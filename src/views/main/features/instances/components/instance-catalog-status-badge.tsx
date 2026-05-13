import { Badge } from "@/views/main/components/ui/badge";

export function InstanceCatalogStatusBadge({
  enabled,
}: {
  enabled: boolean | null;
}) {
  if (enabled === null) return <Badge variant="outline">Local</Badge>;

  return (
    <Badge variant={enabled ? "default" : "outline"}>
      {enabled ? "Enabled" : "Disabled"}
    </Badge>
  );
}
