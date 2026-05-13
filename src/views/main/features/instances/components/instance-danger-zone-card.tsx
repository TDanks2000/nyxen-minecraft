import { Trash2Icon } from "lucide-react";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";

export function InstanceDangerZoneCard({
  onDeleteClick,
}: {
  onDeleteClick: () => void;
}) {
  return (
    <Card className="border-destructive/30" size="sm">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Remove this instance from the launcher library.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={onDeleteClick}
          variant="destructive"
        >
          <Trash2Icon data-icon="inline-start" />
          Delete Instance
        </Button>
      </CardContent>
    </Card>
  );
}
