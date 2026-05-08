import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/views/main/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from "@/views/main/components/ui/separator";
import { Slider } from "@/views/main/components/ui/slider";
import { useLoaderVersions } from "@/views/main/hooks/use-loader-versions";
import { useSettings } from "@/views/main/hooks/use-settings";
import { useVersions } from "@/views/main/hooks/use-versions";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";
import type { LauncherInstance, ModLoader } from "../../../../../shared/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (instance: LauncherInstance) => void;
};

const LOADERS: Array<{ value: ModLoader; label: string }> = [
  { value: "vanilla", label: "Vanilla" },
  { value: "fabric", label: "Fabric" },
  { value: "forge", label: "Forge" },
  { value: "neoforge", label: "NeoForge" },
  { value: "quilt", label: "Quilt" },
];

const ALL_RAM_STOPS = [
  512, 1024, 2048, 3072, 4096, 6144, 8192, 12288, 16384, 32768,
];

const formatRam = (mb: number): string => {
  if (mb < 1024) return `${mb} MB`;
  return `${mb / 1024} GB`;
};

export function NewInstanceDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [versionId, setVersionId] = useState("");
  const [loader, setLoader] = useState<ModLoader>("vanilla");
  const [loaderVersion, setLoaderVersion] = useState("");
  const [ramStops, setRamStops] = useState(ALL_RAM_STOPS);
  const [ramIndex, setRamIndex] = useState(() => {
    const idx = ALL_RAM_STOPS.indexOf(4096);
    return idx >= 0 ? idx : 4;
  });
  const [submitting, setSubmitting] = useState(false);

  const settings = useSettings();
  const includeSnapshots = !!settings.data?.values["launcher.showSnapshots"];
  const versions = useVersions({ includeSnapshots });
  const loaderVersions = useLoaderVersions(loader, versionId);

  useEffect(() => {
    rpc.requestProxy
      .getSystemMemory(null)
      .then(({ totalMb }) => {
        const stops = ALL_RAM_STOPS.filter((mb) => mb <= totalMb);
        if (stops.length === 0) stops.push(ALL_RAM_STOPS[0]!);
        setRamStops(stops);
        setRamIndex((prev) => Math.min(prev, stops.length - 1));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoaderVersion("");
  }, [versionId, loader]);

  const memoryMaxMb = ramStops[ramIndex] ?? 4096;
  const needsLoaderVersion =
    loader !== "vanilla" &&
    loaderVersions.data !== null &&
    loaderVersions.data.length > 0;

  const canSubmit =
    !submitting &&
    name.trim().length >= 2 &&
    versionId.length > 0 &&
    (!needsLoaderVersion || loaderVersion.length > 0) &&
    !(loader !== "vanilla" && loaderVersions.loading);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const instance = await rpc.requestProxy.createLauncherInstance({
        name: name.trim(),
        versionId,
        loader,
        loaderVersion: loaderVersion || undefined,
        memoryMaxMb,
      });
      toast.success("Instance created");
      onCreated(instance);
      onOpenChange(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create instance");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setName("");
    setVersionId("");
    setLoader("vanilla");
    setLoaderVersion("");
    const defaultIdx = ramStops.indexOf(4096);
    setRamIndex(
      defaultIdx >= 0 ? defaultIdx : Math.min(4, ramStops.length - 1),
    );
  }

  const versionsEmpty =
    !versions.loading && !versions.error && versions.data?.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Instance</DialogTitle>
          <DialogDescription>
            Configure a new Minecraft instance to add to your library.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
          {/* ── Instance Details ── */}
          <div className="flex flex-col gap-4 py-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Instance Details
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ni-name">Name</Label>
              <Input
                id="ni-name"
                placeholder="My Instance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={64}
                required
              />
            </div>
          </div>

          <Separator />

          {/* ── Game Version ── */}
          <div className="flex flex-col gap-4 py-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Game Version
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ni-version">Minecraft Version</Label>
              {versions.loading ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin shrink-0" />
                  Loading versions…
                </div>
              ) : versionsEmpty ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                    No versions available
                  </div>
                  <p className="text-xs text-destructive">
                    Could not fetch version manifest.{" "}
                    <button
                      type="button"
                      className="underline hover:no-underline"
                      onClick={versions.refreshManifest}
                    >
                      Retry
                    </button>
                  </p>
                </div>
              ) : versions.error ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-destructive/50 bg-muted text-sm text-muted-foreground">
                    Failed to load versions
                  </div>
                  <button
                    type="button"
                    className="text-xs text-primary underline hover:no-underline text-left"
                    onClick={versions.refresh}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <Select
                  value={versionId}
                  onValueChange={(v) => v && setVersionId(v)}
                >
                  <SelectTrigger id="ni-version">
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.data?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.id}
                        <span className="ml-2 text-muted-foreground text-xs">
                          {v.type}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Mod Loader segmented control */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className={cn(!versionId && "text-muted-foreground/60")}>
                  Mod Loader
                </Label>
                {!versionId && (
                  <span className="text-[0.7rem] text-muted-foreground">
                    Select a version first
                  </span>
                )}
              </div>
              <div
                role="group"
                aria-label="Mod loader"
                className={cn(
                  "grid grid-cols-5 rounded-lg border border-input overflow-hidden",
                  !versionId && "opacity-50 pointer-events-none",
                )}
              >
                {LOADERS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    disabled={!versionId}
                    onClick={() => setLoader(l.value)}
                    className={cn(
                      "py-2 text-xs font-medium transition-colors",
                      "border-r border-input last:border-r-0",
                      loader === l.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loader version — shown after non-vanilla + MC version both selected */}
            {loader !== "vanilla" && versionId && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ni-loader-version">
                  {LOADERS.find((l) => l.value === loader)?.label} Version
                </Label>
                {loaderVersions.loading ? (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground">
                    <Loader2Icon className="size-3.5 animate-spin shrink-0" />
                    Fetching versions…
                  </div>
                ) : loaderVersions.error ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-destructive/50 bg-muted text-sm text-muted-foreground">
                      Failed to load versions
                    </div>
                    <button
                      type="button"
                      className="text-xs text-primary underline hover:no-underline text-left"
                      onClick={loaderVersions.refresh}
                    >
                      Retry
                    </button>
                  </div>
                ) : loaderVersions.data?.length === 0 ? (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                    No versions available for {versionId}
                  </div>
                ) : (
                  <Select
                    value={loaderVersion}
                    onValueChange={(v) => v && setLoaderVersion(v)}
                  >
                    <SelectTrigger id="ni-loader-version">
                      <SelectValue placeholder="Select a version" />
                    </SelectTrigger>
                    <SelectContent>
                      {loaderVersions.data?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.id}
                          {!v.stable && (
                            <span className="ml-2 text-amber-500 text-xs">
                              beta
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* ── Performance ── */}
          <div className="flex flex-col gap-4 py-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Performance
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>Max Memory</Label>
                <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">
                  {formatRam(memoryMaxMb)}
                </span>
              </div>
              <Slider
                min={0}
                max={ramStops.length - 1}
                step={1}
                value={[ramIndex] as number[]}
                onValueChange={(v) => {
                  const newIndex = Array.isArray(v)
                    ? ((v as number[])[0] ?? 0)
                    : Math.round(v as number);
                  setRamIndex(newIndex);
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatRam(ramStops[0] ?? 512)}</span>
                <span>{formatRam(ramStops[ramStops.length - 1] ?? 16384)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting && (
                <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
              )}
              Create Instance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
