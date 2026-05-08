import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import type {
  LauncherProfile,
  LauncherProfileKind,
} from "../../../../../shared/types";
import { rpc } from "@/views/main/lib/rpc";
import { Button } from "@/views/main/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/views/main/components/ui/dialog";
import { Input } from "@/views/main/components/ui/input";
import { Label } from "@/views/main/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (profile: LauncherProfile) => void;
};

export function AddProfileDialog({ open, onOpenChange, onCreated }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [kind, setKind] = useState<LauncherProfileKind>("offline");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !submitting && displayName.trim().length >= 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const profile = await rpc.requestProxy.createLauncherProfile({
        displayName: displayName.trim(),
        kind,
      });
      toast.success("Profile added");
      onCreated(profile);
      onOpenChange(false);
      setDisplayName("");
      setKind("offline");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ap-name">Display Name</Label>
            <Input
              id="ap-name"
              placeholder="Player name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              minLength={3}
              maxLength={32}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ap-kind">Account Type</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as LauncherProfileKind)}
            >
              <SelectTrigger id="ap-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="microsoft">Microsoft</SelectItem>
              </SelectContent>
            </Select>
            {kind === "microsoft" && (
              <p className="text-xs text-muted-foreground">
                Microsoft auth is not available yet. Profile will be created
                without account linking.
              </p>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting && (
                <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
              )}
              Add Profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
