import { FolderOpenIcon } from "lucide-react";
import type { LauncherInstance } from "@/shared/types";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import { openInstancePath } from "@/views/main/features/instances/components/instance-content-format";

export function InstanceFoldersCard({
  instance,
}: {
  instance: LauncherInstance;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Folders</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {(
          [
            ["Game", instance.gameDirectory],
            ["Mods", instance.folders.mods],
            ["Resource Packs", instance.folders.resourcePacks],
            ["Shader Packs", instance.folders.shaderPacks],
            ["Logs", instance.folders.logs],
          ] satisfies Array<[string, string]>
        ).map(([label, path]) => (
          <Button
            className="justify-start"
            key={label}
            onClick={() => openInstancePath(path)}
            size="sm"
            variant="outline"
          >
            <FolderOpenIcon data-icon="inline-start" />
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
