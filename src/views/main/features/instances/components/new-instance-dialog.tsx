import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { LauncherInstance, ModLoader } from "@/shared/types";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/views/main/components/ui/field";
import { Input } from "@/views/main/components/ui/input";
import {
  MultiStepDialog,
  MultiStepDialogContent,
  type MultiStepDialogStep,
} from "@/views/main/components/ui/multi-step-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { Slider } from "@/views/main/components/ui/slider";
import { Spinner } from "@/views/main/components/ui/spinner";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/views/main/components/ui/toggle-group";
import { useLoaderVersions } from "@/views/main/hooks/use-loader-versions";
import { useSettings } from "@/views/main/hooks/use-settings";
import { useVersions } from "@/views/main/hooks/use-versions";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";
import {
  canCreateNewInstanceFromAction,
  getNewInstanceFormSubmitAction,
} from "../new-instance-dialog-logic";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (instance: LauncherInstance) => void;
};

const FORM_ID = "new-instance-form";

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
  const [stepIndex, setStepIndex] = useState(0);
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
        if (stops.length === 0) stops.push(ALL_RAM_STOPS[0] ?? 512);
        setRamStops(stops);
        setRamIndex((prev) => Math.min(prev, stops.length - 1));
      })
      .catch(() => {});
  }, []);

  const memoryMaxMb = ramStops[ramIndex] ?? 4096;
  const versionsEmpty =
    !versions.loading && !versions.error && versions.data?.length === 0;
  const versionLookupReady =
    !versions.loading && !versions.error && !versionsEmpty;
  const loaderVersionRequired = loader !== "vanilla" && versionId.length > 0;
  const loaderSelectionPending =
    loaderVersionRequired && loaderVersions.loading;
  const loaderVersionsEmpty =
    loaderVersionRequired &&
    !loaderSelectionPending &&
    !loaderVersions.error &&
    loaderVersions.data?.length === 0;
  const loaderSelectionUnavailable =
    loaderVersionRequired &&
    !loaderSelectionPending &&
    (!!loaderVersions.error || loaderVersionsEmpty);
  const needsLoaderVersion =
    loaderVersionRequired &&
    !loaderSelectionUnavailable &&
    (loaderVersions.data?.length ?? 0) > 0;
  const loaderVersionComplete =
    !needsLoaderVersion ||
    (loaderVersion.length > 0 &&
      (loaderVersions.data?.some((version) => version.id === loaderVersion) ??
        false));

  const detailsComplete = name.trim().length >= 2;
  const versionComplete =
    versionId.length > 0 &&
    versionLookupReady &&
    loaderVersionComplete &&
    !loaderSelectionPending &&
    !loaderSelectionUnavailable;
  const performanceComplete = detailsComplete && versionComplete;
  const canSubmit = !submitting && performanceComplete;

  const steps: Array<MultiStepDialogStep> = [
    {
      id: "details",
      title: "Details",
      description: "Name the instance.",
      completed: detailsComplete,
    },
    {
      id: "version",
      title: "Version",
      description: "Choose Minecraft and loader.",
      completed: versionComplete,
      disabled: !detailsComplete,
    },
    {
      id: "performance",
      title: "Performance",
      description: "Set launch memory.",
      completed: performanceComplete,
      disabled: !versionComplete,
    },
  ];

  const maxSelectableStepIndex = detailsComplete
    ? versionComplete
      ? 2
      : 1
    : 0;
  const lastStepIndex = steps.length - 1;
  const activeStepIndex = Math.min(
    Math.max(stepIndex, 0),
    maxSelectableStepIndex,
  );
  const isLastStep = activeStepIndex === lastStepIndex;
  const canContinue =
    activeStepIndex === 0
      ? detailsComplete
      : activeStepIndex === 1
        ? versionComplete
        : canSubmit;

  useEffect(() => {
    if (stepIndex !== activeStepIndex) {
      setStepIndex(activeStepIndex);
    }
  }, [activeStepIndex, stepIndex]);

  useEffect(() => {
    if (
      loaderVersion &&
      needsLoaderVersion &&
      !loaderVersions.data?.some((version) => version.id === loaderVersion)
    ) {
      setLoaderVersion("");
    }
  }, [loaderVersion, loaderVersions.data, needsLoaderVersion]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleContinue = () => {
    if (!canContinue) return;
    setStepIndex(Math.min(activeStepIndex + 1, lastStepIndex));
  };

  const handleBack = () => {
    setStepIndex(Math.max(activeStepIndex - 1, 0));
  };

  const handleStepChange = (nextStepIndex: number) => {
    setStepIndex(Math.min(Math.max(nextStepIndex, 0), maxSelectableStepIndex));
  };

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;

    const submitAction = getNewInstanceFormSubmitAction({
      activeStepIndex,
      lastStepIndex,
      canContinue,
      hasSubmitter: !!submitter,
    });

    if (submitAction === "continue") {
      handleContinue();
    }
  }

  async function handleCreateInstance() {
    if (
      !canCreateNewInstanceFromAction({
        activeStepIndex,
        lastStepIndex,
        canSubmit,
      })
    ) {
      return;
    }

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
      handleOpenChange(false);
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
    setStepIndex(0);
    const defaultIdx = ramStops.indexOf(4096);
    setRamIndex(
      defaultIdx >= 0 ? defaultIdx : Math.min(4, ramStops.length - 1),
    );
  }

  const loaderLabel = LOADERS.find((l) => l.value === loader)?.label;

  return (
    <MultiStepDialog open={open} onOpenChange={handleOpenChange}>
      <MultiStepDialogContent
        title="New Instance"
        description="Configure a Minecraft instance for the launcher library."
        steps={steps}
        stepIndex={activeStepIndex}
        onStepChange={handleStepChange}
        maxSelectableStepIndex={maxSelectableStepIndex}
        secondaryAction={
          activeStepIndex === 0
            ? {
                label: "Cancel",
                onClick: () => handleOpenChange(false),
                disabled: submitting,
              }
            : {
                label: "Back",
                onClick: handleBack,
                disabled: submitting,
              }
        }
        primaryAction={
          isLastStep
            ? {
                label: "Create Instance",
                loadingLabel: "Creating",
                onClick: handleCreateInstance,
                loading: submitting,
                disabled: !canSubmit,
              }
            : {
                label: "Continue",
                onClick: handleContinue,
                disabled: !canContinue,
              }
        }
        supportingAction={getStepHint({
          stepIndex: activeStepIndex,
          detailsComplete,
          versionId,
          loaderSelectionPending,
          loaderSelectionUnavailable,
          loaderVersionsEmpty,
          loaderVersionsError: loaderVersions.error,
          needsLoaderVersion,
          loaderVersionComplete,
        })}
      >
        <form id={FORM_ID} onSubmit={handleFormSubmit}>
          {/* Step 0 - always in DOM, CSS-hidden when not active */}
          <div className={cn(activeStepIndex !== 0 && "hidden")}>
            <FieldGroup>
              <Field data-invalid={name.length > 0 && !detailsComplete}>
                <FieldLabel htmlFor="ni-name">Instance Name</FieldLabel>
                <Input
                  id="ni-name"
                  placeholder="Survival world"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={64}
                  required
                  aria-invalid={name.length > 0 && !detailsComplete}
                />
                <FieldDescription>
                  This name appears in the dashboard, instance list, and launch
                  menu.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </div>

          {/* Step 1 - always in DOM, CSS-hidden when not active */}
          <div className={cn(activeStepIndex !== 1 && "hidden")}>
            <FieldGroup>
              <Field data-invalid={!!versions.error || versionsEmpty}>
                <FieldLabel htmlFor="ni-version">Minecraft Version</FieldLabel>
                {versions.loading ? (
                  <LoadingBox label="Loading versions" />
                ) : versionsEmpty ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-muted px-2.5 text-muted-foreground text-sm">
                      No versions available
                    </div>
                    <button
                      type="button"
                      className="w-fit text-left text-primary text-xs underline hover:no-underline"
                      onClick={versions.refreshManifest}
                    >
                      Retry manifest refresh
                    </button>
                  </div>
                ) : versions.error ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex h-8 items-center gap-2 rounded-lg border border-destructive/50 bg-muted px-2.5 text-muted-foreground text-sm">
                      Failed to load versions
                    </div>
                    <button
                      type="button"
                      className="w-fit text-left text-primary text-xs underline hover:no-underline"
                      onClick={versions.refresh}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <Select
                    value={versionId}
                    onValueChange={(v) => {
                      if (v) {
                        setVersionId(v);
                        setLoaderVersion("");
                      }
                    }}
                  >
                    <SelectTrigger id="ni-version" className="w-full">
                      <SelectValue placeholder="Select a version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {versions.data?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.id}
                            <span className="ml-2 text-muted-foreground text-xs">
                              {v.type}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </Field>

              {/* Always rendered - no layout shift when a version is selected */}
              <FieldSet
                disabled={!versionId}
                data-disabled={!versionId}
                className={cn(!versionId && "opacity-50")}
              >
                <FieldLegend
                  variant="label"
                  className={cn(!versionId && "text-muted-foreground/60")}
                >
                  Mod Loader
                </FieldLegend>
                <ToggleGroup
                  aria-label="Mod loader"
                  className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-lg border border-input bg-border sm:grid-cols-5"
                  disabled={!versionId}
                  value={[loader]}
                  onValueChange={(value) => {
                    const nextLoader = value[0] as ModLoader | undefined;
                    if (!nextLoader || nextLoader === loader) return;
                    setLoader(nextLoader);
                    setLoaderVersion("");
                  }}
                >
                  {LOADERS.map((l) => (
                    <ToggleGroupItem
                      key={l.value}
                      type="button"
                      value={l.value}
                      className="min-h-9 w-full rounded-none border-0 bg-background px-2 py-2 text-xs font-semibold data-[pressed]:bg-primary data-[pressed]:text-primary-foreground data-[pressed]:hover:bg-primary data-[pressed]:hover:text-primary-foreground"
                    >
                      {l.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldSet>

              {/* Always rendered - no layout shift when switching loaders */}
              <Field
                data-invalid={
                  loaderVersionRequired && loaderSelectionUnavailable
                }
              >
                <FieldLabel
                  htmlFor="ni-loader-version"
                  className={cn(
                    (loader === "vanilla" || !versionId) &&
                      "text-muted-foreground/60",
                  )}
                >
                  {loader !== "vanilla"
                    ? `${loaderLabel} Version`
                    : "Loader Version"}
                </FieldLabel>
                {loader === "vanilla" || !versionId ? (
                  <div className="flex h-8 items-center rounded-lg border border-input bg-muted px-2.5 text-muted-foreground text-sm">
                    {loader === "vanilla"
                      ? "Not required for Vanilla"
                      : "Select a Minecraft version first"}
                  </div>
                ) : loaderVersions.loading ? (
                  <LoadingBox label="Fetching loader versions" />
                ) : loaderVersions.error ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex h-8 items-center gap-2 rounded-lg border border-destructive/50 bg-muted px-2.5 text-muted-foreground text-sm">
                      Failed to load versions
                    </div>
                    <button
                      type="button"
                      className="w-fit text-left text-primary text-xs underline hover:no-underline"
                      onClick={loaderVersions.refresh}
                    >
                      Retry
                    </button>
                  </div>
                ) : loaderVersions.data?.length === 0 ? (
                  <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-muted px-2.5 text-muted-foreground text-sm">
                    No versions available for {versionId}
                  </div>
                ) : (
                  <Select
                    value={loaderVersion}
                    onValueChange={(v) => v && setLoaderVersion(v)}
                  >
                    <SelectTrigger id="ni-loader-version" className="w-full">
                      <SelectValue placeholder="Select a version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {loaderVersions.data?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.id}
                            {!v.stable && (
                              <span className="ml-2 text-muted-foreground text-xs">
                                beta
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </FieldGroup>
          </div>

          {/* Step 2 - always in DOM, CSS-hidden when not active */}
          <div className={cn(activeStepIndex !== 2 && "hidden")}>
            <FieldGroup>
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel>Max Memory</FieldLabel>
                  <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-sm tabular-nums">
                    {formatRam(memoryMaxMb)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={ramStops.length - 1}
                  step={1}
                  value={[ramIndex] as Array<number>}
                  onValueChange={(v) => {
                    const newIndex = Array.isArray(v)
                      ? ((v as Array<number>)[0] ?? 0)
                      : Math.round(v as number);
                    setRamIndex(newIndex);
                  }}
                />
                <div className="flex justify-between gap-3 text-muted-foreground text-xs">
                  <span>{formatRam(ramStops[0] ?? 512)}</span>
                  <span>
                    {formatRam(ramStops[ramStops.length - 1] ?? 16384)}
                  </span>
                </div>
                <FieldDescription>
                  This sets the maximum Java heap for the instance. You can tune
                  it again from instance settings.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </div>
        </form>
      </MultiStepDialogContent>
    </MultiStepDialog>
  );
}

function LoadingBox({ label }: { label: string }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-muted-foreground text-sm">
      <Spinner className="size-3.5" />
      {label}
    </div>
  );
}

function getStepHint({
  stepIndex,
  detailsComplete,
  versionId,
  loaderSelectionPending,
  loaderSelectionUnavailable,
  loaderVersionsEmpty,
  loaderVersionsError,
  needsLoaderVersion,
  loaderVersionComplete,
}: {
  stepIndex: number;
  detailsComplete: boolean;
  versionId: string;
  loaderSelectionPending: boolean;
  loaderSelectionUnavailable: boolean;
  loaderVersionsEmpty: boolean;
  loaderVersionsError: string | null;
  needsLoaderVersion: boolean;
  loaderVersionComplete: boolean;
}) {
  if (stepIndex === 0 && !detailsComplete) {
    return "Use at least two characters.";
  }

  if (stepIndex === 1) {
    if (!versionId) return "Choose a Minecraft version to continue.";
    if (loaderSelectionPending) return "Waiting for loader versions.";
    if (loaderSelectionUnavailable) {
      if (loaderVersionsError)
        return "Retry loader version lookup to continue.";
      if (loaderVersionsEmpty) {
        return "No loader versions are available for this Minecraft version.";
      }
    }
    if (needsLoaderVersion && !loaderVersionComplete) {
      return "Choose a loader version to continue.";
    }
  }

  if (stepIndex === 2) {
    return "Memory can be changed later.";
  }

  return null;
}
