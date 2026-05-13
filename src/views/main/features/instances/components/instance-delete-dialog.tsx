import { AlertTriangleIcon, Trash2Icon } from "lucide-react";
import type { LauncherInstance } from "@/shared/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/views/main/components/ui/alert-dialog";
import { Spinner } from "@/views/main/components/ui/spinner";
import { Switch } from "@/views/main/components/ui/switch";

type InstanceDeleteDialogProps = {
  deleteFiles: boolean;
  deleting: boolean;
  instance: LauncherInstance;
  onDelete: () => void;
  onDeleteFilesChange: (deleteFiles: boolean) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function InstanceDeleteDialog({
  deleteFiles,
  deleting,
  instance,
  onDelete,
  onDeleteFilesChange,
  onOpenChange,
  open,
}: InstanceDeleteDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangleIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {instance.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Removing the library record is immediate. You can also delete the
            files under this instance folder.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border border-border bg-muted/35 p-3">
          <div className="flex items-start gap-3">
            <Switch
              checked={deleteFiles}
              disabled={deleting}
              onCheckedChange={onDeleteFilesChange}
              size="sm"
            />
            <div className="min-w-0">
              <div className="font-semibold text-sm">Delete instance files</div>
              <div className="mt-1 break-all text-muted-foreground text-xs">
                {instance.instanceDirectory}
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              onDelete();
            }}
            variant="destructive"
          >
            {deleting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Trash2Icon data-icon="inline-start" />
            )}
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
