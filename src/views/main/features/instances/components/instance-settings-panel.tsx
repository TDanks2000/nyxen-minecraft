import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FolderOpenIcon,
  GaugeIcon,
  InfoIcon,
  PuzzleIcon,
  RotateCcwIcon,
  SaveIcon,
  Trash2Icon,
  UserRoundIcon,
  WrenchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  InstanceFileEntry,
  LauncherInstance,
  LauncherProfile,
  ModLoader,
} from "@/shared/types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/views/main/components/ui/alert";
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
import { Badge } from "@/views/main/components/ui/badge";
import { Button } from "@/views/main/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/views/main/components/ui/select";
import { Separator } from "@/views/main/components/ui/separator";
import { Slider } from "@/views/main/components/ui/slider";
import { Spinner } from "@/views/main/components/ui/spinner";
import { Switch } from "@/views/main/components/ui/switch";
import { Textarea } from "@/views/main/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/views/main/components/ui/toggle-group";
import { LOADER_LABELS } from "@/views/main/features/instances/components/instance-format";
import { useLoaderVersions } from "@/views/main/hooks/use-loader-versions";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { useSettings } from "@/views/main/hooks/use-settings";
import { useVersions } from "@/views/main/hooks/use-versions";
import { openLocalPath } from "@/views/main/lib/open-local-path";
import { rpc } from "@/views/main/lib/rpc";
import { cn } from "@/views/main/lib/utils";

type InstanceSettingsPanelProps = {
  instance: LauncherInstance;
  mods: Array<InstanceFileEntry>;
  onInstanceDeleted: (instanceId: string) => void;
  onInstanceUpdated: (instance: LauncherInstance) => void;
  onReviewMods: () => void;
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

const AUTO_PROFILE_VALUE = "__auto_profile__";

const SETTINGS_FLOW = [
  { icon: UserRoundIcon, label: "Details" },
  { icon: PuzzleIcon, label: "Version" },
  { icon: GaugeIcon, label: "Performance" },
  { icon: WrenchIcon, label: "Advanced" },
];

const formatRam = (mb: number): string => {
  if (mb < 1024) return `${mb} MB`;
  return `${mb / 1024} GB`;
};

const parseArgLines = (value: string): Array<string> =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const isVerifiedMinecraftProfile = (profile: LauncherProfile): boolean => {
  const entitlements = new Set(profile.entitlements);

  return (
    profile.kind === "microsoft" &&
    Boolean(profile.accountId) &&
    Boolean(profile.ownershipCheckedAt) &&
    entitlements.has("game_minecraft") &&
    entitlements.has("product_minecraft")
  );
};

const getClosestRamIndex = (stops: Array<number>, value: number): number => {
  if (stops.length === 0) return 0;

  return stops.reduce((closestIndex, stop, index) => {
    const currentDistance = Math.abs(stop - value);
    const closestDistance = Math.abs((stops[closestIndex] ?? stop) - value);
    return currentDistance < closestDistance ? index : closestIndex;
  }, 0);
};

const openExternalPath = (path: string) => {
  void openLocalPath(path);
};

function SettingsFlowStrip({ blocked }: { blocked: boolean }) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {SETTINGS_FLOW.map((step, index) => {
        const Icon = step.icon;
        const guarded = blocked && step.label === "Version";

        return (
          <div
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2",
              guarded && "border-destructive/40 bg-destructive/10",
            )}
            key={step.label}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon />
            </span>
            <div className="min-w-0">
              <div className="text-muted-foreground text-xs">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="truncate font-heading font-semibold text-sm">
                {step.label}
              </div>
            </div>
            {guarded ? (
              <AlertTriangleIcon className="ml-auto text-destructive" />
            ) : (
              <CheckCircle2Icon className="ml-auto text-primary" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function InstanceSettingsPanel({
  instance,
  mods,
  onInstanceDeleted,
  onInstanceUpdated,
  onReviewMods,
}: InstanceSettingsPanelProps) {
  const profiles = useProfiles();
  const settings = useSettings();
  const includeSnapshots = !!settings.data?.values["launcher.showSnapshots"];
  const versions = useVersions({ includeSnapshots });
  const [name, setName] = useState(instance.name);
  const [iconUrl, setIconUrl] = useState(instance.iconUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(instance.bannerUrl ?? "");
  const [versionId, setVersionId] = useState(instance.versionId);
  const [loader, setLoader] = useState<ModLoader>(instance.loader);
  const [loaderVersion, setLoaderVersion] = useState(
    instance.loaderVersion ?? "",
  );
  const [profileValue, setProfileValue] = useState(
    instance.profileId ?? AUTO_PROFILE_VALUE,
  );
  const [memoryMinMb, setMemoryMinMb] = useState(String(instance.memoryMinMb));
  const [ramStops, setRamStops] = useState(() => {
    const stops = [...ALL_RAM_STOPS];
    if (!stops.includes(instance.memoryMaxMb)) {
      stops.push(instance.memoryMaxMb);
      stops.sort((a, b) => a - b);
    }
    return stops;
  });
  const [ramIndex, setRamIndex] = useState(() =>
    getClosestRamIndex(ramStops, instance.memoryMaxMb),
  );
  const [javaExecutable, setJavaExecutable] = useState(
    instance.javaExecutable ?? "",
  );
  const [javaArgsText, setJavaArgsText] = useState(
    instance.javaArgs.join("\n"),
  );
  const [gameArgsText, setGameArgsText] = useState(
    instance.gameArgs.join("\n"),
  );
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [compatibilityConfirmed, setCompatibilityConfirmed] = useState(false);

  const loaderVersions = useLoaderVersions(loader, versionId);
  const verifiedProfiles = useMemo(
    () => profiles.data?.filter(isVerifiedMinecraftProfile) ?? [],
    [profiles.data],
  );
  const unverifiedProfiles = useMemo(
    () =>
      profiles.data?.filter(
        (profile) => !isVerifiedMinecraftProfile(profile),
      ) ?? [],
    [profiles.data],
  );
  const autoProfile = verifiedProfiles[0] ?? null;
  const selectedProfile =
    profileValue === AUTO_PROFILE_VALUE
      ? autoProfile
      : (profiles.data?.find((profile) => profile.id === profileValue) ?? null);
  const memoryMaxMb = ramStops[ramIndex] ?? instance.memoryMaxMb;
  const minMemoryValue = Number.parseInt(memoryMinMb, 10);
  const nameValid = name.trim().length >= 2 && name.trim().length <= 64;
  const memoryMinValid =
    Number.isFinite(minMemoryValue) &&
    minMemoryValue >= 256 &&
    minMemoryValue <= memoryMaxMb;
  const versionValid =
    versionId.length > 0 &&
    !versions.loading &&
    !versions.error &&
    (versions.data?.some((version) => version.id === versionId) ?? false);
  const loaderLabel =
    LOADERS.find((loaderOption) => loaderOption.value === loader)?.label ??
    loader;
  const nextLoaderVersion =
    loader === "vanilla" ? null : loaderVersion.trim() || null;
  const runtimeChanged =
    versionId !== instance.versionId ||
    loader !== instance.loader ||
    nextLoaderVersion !== instance.loaderVersion;
  const localModCount = mods.length;
  const requiresCompatibilityConfirmation = runtimeChanged && localModCount > 0;
  const versionsEmpty =
    !versions.loading && !versions.error && versions.data?.length === 0;
  const versionLookupReady =
    !versions.loading && !versions.error && !versionsEmpty;
  const loaderNeedsVersion = loader !== "vanilla" && versionId.length > 0;
  const loaderVersionOptions = loaderVersions.data ?? [];
  const loaderSelectionPending = loaderNeedsVersion && loaderVersions.loading;
  const loaderVersionsEmpty =
    loaderNeedsVersion &&
    !loaderSelectionPending &&
    !loaderVersions.error &&
    loaderVersionOptions.length === 0;
  const loaderSelectionUnavailable =
    loaderNeedsVersion &&
    !loaderSelectionPending &&
    (!!loaderVersions.error || loaderVersionsEmpty);
  const needsLoaderVersion =
    loaderNeedsVersion &&
    !loaderSelectionUnavailable &&
    loaderVersionOptions.length > 0;
  const loaderVersionComplete =
    !needsLoaderVersion ||
    (loaderVersion.length > 0 &&
      loaderVersionOptions.some((version) => version.id === loaderVersion));
  const versionComplete =
    versionId.length > 0 &&
    versionLookupReady &&
    loaderVersionComplete &&
    !loaderSelectionPending &&
    !loaderSelectionUnavailable;
  const canSave =
    !saving &&
    nameValid &&
    memoryMinValid &&
    versionComplete &&
    (!requiresCompatibilityConfirmation || compatibilityConfirmed);
  const profileCopy = selectedProfile
    ? `${selectedProfile.displayName} will be used for launch authentication.`
    : profiles.loading
      ? "Loading saved Microsoft profiles."
      : "Add a verified Microsoft profile before launching this instance.";

  useEffect(() => {
    let mounted = true;

    rpc.requestProxy
      .getSystemMemory(null)
      .then(({ totalMb }) => {
        if (!mounted) return;
        const stops = ALL_RAM_STOPS.filter((mb) => mb <= totalMb);
        if (!stops.includes(instance.memoryMaxMb)) {
          stops.push(instance.memoryMaxMb);
        }
        if (stops.length === 0) {
          stops.push(ALL_RAM_STOPS[0] ?? 512);
        }
        stops.sort((a, b) => a - b);
        setRamStops(stops);
        setRamIndex(getClosestRamIndex(stops, instance.memoryMaxMb));
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [instance.memoryMaxMb]);

  useEffect(() => {
    setName(instance.name);
    setIconUrl(instance.iconUrl ?? "");
    setBannerUrl(instance.bannerUrl ?? "");
    setVersionId(instance.versionId);
    setLoader(instance.loader);
    setLoaderVersion(instance.loaderVersion ?? "");
    setProfileValue(instance.profileId ?? AUTO_PROFILE_VALUE);
    setMemoryMinMb(String(instance.memoryMinMb));
    setRamIndex(getClosestRamIndex(ramStops, instance.memoryMaxMb));
    setJavaExecutable(instance.javaExecutable ?? "");
    setJavaArgsText(instance.javaArgs.join("\n"));
    setGameArgsText(instance.gameArgs.join("\n"));
  }, [instance, ramStops]);

  useEffect(() => {
    if (
      loaderVersion &&
      loaderVersionOptions.length > 0 &&
      !loaderVersionOptions.some((version) => version.id === loaderVersion)
    ) {
      setLoaderVersion("");
    }
  }, [loaderVersion, loaderVersionOptions]);

  useEffect(() => {
    if (!requiresCompatibilityConfirmation && compatibilityConfirmed) {
      setCompatibilityConfirmed(false);
    }
  }, [compatibilityConfirmed, requiresCompatibilityConfirmation]);

  const resetForm = () => {
    setName(instance.name);
    setIconUrl(instance.iconUrl ?? "");
    setBannerUrl(instance.bannerUrl ?? "");
    setVersionId(instance.versionId);
    setLoader(instance.loader);
    setLoaderVersion(instance.loaderVersion ?? "");
    setProfileValue(instance.profileId ?? AUTO_PROFILE_VALUE);
    setMemoryMinMb(String(instance.memoryMinMb));
    setRamIndex(getClosestRamIndex(ramStops, instance.memoryMaxMb));
    setJavaExecutable(instance.javaExecutable ?? "");
    setJavaArgsText(instance.javaArgs.join("\n"));
    setGameArgsText(instance.gameArgs.join("\n"));
    setCompatibilityConfirmed(false);
  };

  const keepCurrentRuntime = () => {
    setVersionId(instance.versionId);
    setLoader(instance.loader);
    setLoaderVersion(instance.loaderVersion ?? "");
    setCompatibilityConfirmed(false);
  };

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    try {
      const updated = await rpc.requestProxy.updateLauncherInstance({
        bannerUrl: bannerUrl.trim() || null,
        gameArgs: parseArgLines(gameArgsText),
        iconUrl: iconUrl.trim() || null,
        instanceId: instance.id,
        confirmRuntimeCompatibility: compatibilityConfirmed,
        javaArgs: parseArgLines(javaArgsText),
        javaExecutable: javaExecutable.trim() || null,
        loader,
        loaderVersion: nextLoaderVersion,
        memoryMaxMb,
        memoryMinMb: minMemoryValue,
        name: name.trim(),
        profileId:
          profileValue === AUTO_PROFILE_VALUE ? null : profileValue.trim(),
        versionId,
      });
      toast.success(
        requiresCompatibilityConfirmation
          ? "Settings saved. Review mods before launching."
          : "Instance settings saved",
      );
      onInstanceUpdated(updated);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await rpc.requestProxy.deleteLauncherInstance({
        deleteFiles,
        instanceId: instance.id,
      });
      toast.success(
        deleteFiles
          ? "Instance and files deleted"
          : "Instance removed from library",
      );
      onInstanceDeleted(instance.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete instance",
      );
      setDeleting(false);
    }
  }

  return (
    <>
      <SettingsFlowStrip blocked={requiresCompatibilityConfirmation} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Instance Settings</CardTitle>
              <CardDescription>
                Edit launch identity, version, memory, and Java arguments.
              </CardDescription>
              <CardAction>
                <Badge variant={selectedProfile ? "default" : "outline"}>
                  {selectedProfile ? "Profile ready" : "Needs profile"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!nameValid}>
                  <FieldLabel htmlFor="instance-name">Instance Name</FieldLabel>
                  <Input
                    aria-invalid={!nameValid}
                    id="instance-name"
                    maxLength={64}
                    minLength={2}
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                  />
                  <FieldDescription>
                    Use 2 to 64 characters. This name appears in the library and
                    launch report.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="instance-profile">
                    Launch Profile
                  </FieldLabel>
                  <Select
                    onValueChange={(value) =>
                      setProfileValue(value ?? AUTO_PROFILE_VALUE)
                    }
                    value={profileValue}
                  >
                    <SelectTrigger id="instance-profile" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Automatic</SelectLabel>
                        <SelectItem value={AUTO_PROFILE_VALUE}>
                          First verified Microsoft profile
                          {autoProfile ? (
                            <span className="text-muted-foreground text-xs">
                              {autoProfile.displayName}
                            </span>
                          ) : null}
                        </SelectItem>
                      </SelectGroup>
                      {verifiedProfiles.length > 0 ? (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel>Verified Profiles</SelectLabel>
                            {verifiedProfiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.displayName}
                                <span className="text-muted-foreground text-xs">
                                  Microsoft
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </>
                      ) : null}
                      {unverifiedProfiles.length > 0 ? (
                        <>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel>Unavailable</SelectLabel>
                            {unverifiedProfiles.map((profile) => (
                              <SelectItem
                                disabled
                                key={profile.id}
                                value={`disabled-${profile.id}`}
                              >
                                {profile.displayName}
                                <span className="text-muted-foreground text-xs">
                                  verify first
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <FieldDescription>{profileCopy}</FieldDescription>
                </Field>

                <FieldGroup className="grid gap-4 lg:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="instance-icon">
                      Instance Icon
                    </FieldLabel>
                    <Input
                      id="instance-icon"
                      onChange={(event) => setIconUrl(event.target.value)}
                      placeholder="https://example.com/icon.png or /path/icon.png"
                      value={iconUrl}
                    />
                    <FieldDescription>
                      Square artwork used in cards, lists, and the header.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="instance-banner">
                      Instance Banner
                    </FieldLabel>
                    <Input
                      id="instance-banner"
                      onChange={(event) => setBannerUrl(event.target.value)}
                      placeholder="https://example.com/banner.jpg or /path/banner.jpg"
                      value={bannerUrl}
                    />
                    <FieldDescription>
                      Wide artwork used behind instance cards and details.
                    </FieldDescription>
                  </Field>
                </FieldGroup>

                <FieldGroup className="grid gap-4 lg:grid-cols-2">
                  <Field data-invalid={!!versions.error || versionsEmpty}>
                    <FieldLabel htmlFor="instance-version">
                      Minecraft Version
                    </FieldLabel>
                    {versions.loading ? (
                      <LoadingBox label="Loading versions" />
                    ) : versionsEmpty ? (
                      <RetryBox
                        label="No versions available"
                        onRetry={versions.refreshManifest}
                      />
                    ) : versions.error ? (
                      <RetryBox
                        label="Failed to load versions"
                        onRetry={versions.refresh}
                      />
                    ) : (
                      <Select
                        onValueChange={(value) => {
                          if (!value) return;
                          setVersionId(value);
                          setLoaderVersion("");
                        }}
                        value={versionId}
                      >
                        <SelectTrigger
                          aria-invalid={!versionValid}
                          id="instance-version"
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {versions.data?.map((version) => (
                              <SelectItem key={version.id} value={version.id}>
                                {version.id}
                                <span className="text-muted-foreground text-xs">
                                  {version.type}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </Field>

                  <FieldSet>
                    <FieldLegend variant="label">Mod Loader</FieldLegend>
                    <ToggleGroup
                      aria-label="Mod loader"
                      className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-lg border border-input bg-border sm:grid-cols-5 lg:grid-cols-3 2xl:grid-cols-5"
                      onValueChange={(value) => {
                        const nextLoader = value[0] as ModLoader | undefined;
                        if (!nextLoader || nextLoader === loader) return;
                        setLoader(nextLoader);
                        setLoaderVersion("");
                      }}
                      value={[loader]}
                    >
                      {LOADERS.map((loaderOption) => (
                        <ToggleGroupItem
                          className="min-h-9 w-full rounded-none border-0 bg-background px-2 py-2 text-xs font-semibold data-[pressed]:bg-primary data-[pressed]:text-primary-foreground data-[pressed]:hover:bg-primary data-[pressed]:hover:text-primary-foreground"
                          key={loaderOption.value}
                          type="button"
                          value={loaderOption.value}
                        >
                          {loaderOption.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FieldSet>
                </FieldGroup>

                <Field
                  data-invalid={
                    loaderNeedsVersion && loaderSelectionUnavailable
                  }
                >
                  <FieldLabel htmlFor="instance-loader-version">
                    {loader !== "vanilla"
                      ? `${loaderLabel} Version`
                      : "Loader Version"}
                  </FieldLabel>
                  {loader === "vanilla" ? (
                    <div className="flex h-8 items-center rounded-lg border border-input bg-muted px-2.5 text-muted-foreground text-sm">
                      Not required for Vanilla
                    </div>
                  ) : loaderVersions.loading ? (
                    <LoadingBox label="Loading loader versions" />
                  ) : loaderVersions.error ? (
                    <RetryBox
                      label="Failed to load loader versions"
                      onRetry={loaderVersions.refresh}
                    />
                  ) : loaderVersionOptions.length === 0 ? (
                    <div className="flex h-8 items-center rounded-lg border border-input bg-muted px-2.5 text-muted-foreground text-sm">
                      No loader versions available for {versionId}
                    </div>
                  ) : (
                    <Select
                      onValueChange={(value) =>
                        value && setLoaderVersion(value)
                      }
                      value={loaderVersion}
                    >
                      <SelectTrigger
                        aria-invalid={
                          loaderNeedsVersion && !loaderVersionComplete
                        }
                        id="instance-loader-version"
                        className="w-full"
                      >
                        <SelectValue placeholder="Select loader version" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {loaderVersionOptions.map((version) => (
                            <SelectItem key={version.id} value={version.id}>
                              {version.id}
                              {!version.stable ? (
                                <span className="text-muted-foreground text-xs">
                                  beta
                                </span>
                              ) : null}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                  <FieldDescription>
                    Loader changes are applied on the next launch report.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {requiresCompatibilityConfirmation ? (
            <Alert variant="destructive">
              <AlertTriangleIcon />
              <AlertTitle>Compatibility Review Required</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <p>
                  This instance has {localModCount} local mod
                  {localModCount === 1 ? "" : "s"}. Changing Minecraft or the
                  mod loader keeps those files in place, so incompatible jars
                  must be updated, replaced, or removed before launch.
                </p>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-background/65 px-3 py-2">
                    <div className="text-muted-foreground">Current runtime</div>
                    <div className="mt-1 font-semibold">
                      {instance.versionId} · {LOADER_LABELS[instance.loader]}
                      {instance.loaderVersion
                        ? ` ${instance.loaderVersion}`
                        : ""}
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-background/65 px-3 py-2">
                    <div className="text-muted-foreground">Next runtime</div>
                    <div className="mt-1 font-semibold">
                      {versionId} · {LOADER_LABELS[loader]}
                      {nextLoaderVersion ? ` ${nextLoaderVersion}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-md border border-border bg-background/65 p-3">
                  <Switch
                    aria-label="Confirm mod compatibility review"
                    checked={compatibilityConfirmed}
                    onCheckedChange={setCompatibilityConfirmed}
                    size="sm"
                  />
                  <span>
                    I understand the runtime change may break local mods and
                    will review compatibility before launching.
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={onReviewMods}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <PuzzleIcon data-icon="inline-start" />
                    Review Mods
                  </Button>
                  <Button
                    onClick={keepCurrentRuntime}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    Keep Current Runtime
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
              <CardDescription>
                Keep memory explicit so large modpacks are predictable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!memoryMinValid}>
                  <FieldLabel htmlFor="memory-min">Minimum Memory</FieldLabel>
                  <Input
                    aria-invalid={!memoryMinValid}
                    id="memory-min"
                    inputMode="numeric"
                    min={256}
                    onChange={(event) => setMemoryMinMb(event.target.value)}
                    type="number"
                    value={memoryMinMb}
                  />
                  <FieldDescription>
                    Must be at least 256 MB and no more than the max memory.
                  </FieldDescription>
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Maximum Memory</FieldLabel>
                    <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-sm tabular-nums">
                      {formatRam(memoryMaxMb)}
                    </span>
                  </div>
                  <Slider
                    max={ramStops.length - 1}
                    min={0}
                    onValueChange={(value) => {
                      const nextIndex =
                        typeof value === "number"
                          ? Math.round(value)
                          : (value[0] ?? 0);
                      setRamIndex(nextIndex);
                    }}
                    step={1}
                    value={[ramIndex]}
                  />
                  <div className="flex justify-between gap-3 text-muted-foreground text-xs">
                    <span>{formatRam(ramStops[0] ?? 512)}</span>
                    <span>
                      {formatRam(ramStops[ramStops.length - 1] ?? 16384)}
                    </span>
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Launch Arguments</CardTitle>
              <CardDescription>
                Put one argument per line. Empty lines are ignored.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="grid gap-4 lg:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="java-executable">
                    Java Executable
                  </FieldLabel>
                  <Input
                    id="java-executable"
                    onChange={(event) => setJavaExecutable(event.target.value)}
                    placeholder="Managed by Nyxen"
                    value={javaExecutable}
                  />
                  <FieldDescription>
                    Leave blank to use the launcher Java setting.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="java-args">Java Arguments</FieldLabel>
                  <Textarea
                    id="java-args"
                    onChange={(event) => setJavaArgsText(event.target.value)}
                    placeholder="-XX:+UseG1GC"
                    value={javaArgsText}
                  />
                </Field>
                <Field className="lg:col-span-2">
                  <FieldLabel htmlFor="game-args">Game Arguments</FieldLabel>
                  <Textarea
                    id="game-args"
                    onChange={(event) => setGameArgsText(event.target.value)}
                    placeholder="--width&#10;1280"
                    value={gameArgsText}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-10 -mx-4 border-border border-t bg-background/92 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-5 sm:px-5">
            <div className="mx-auto flex max-w-[90rem] flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                disabled={saving}
                onClick={resetForm}
                size="lg"
                variant="outline"
              >
                <RotateCcwIcon data-icon="inline-start" />
                Reset
              </Button>
              <Button disabled={!canSave} onClick={handleSave} size="lg">
                {saving ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRoundIcon className="size-4 text-primary" />
                Profile Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Selected</div>
                <div className="mt-1 truncate font-semibold">
                  {selectedProfile?.displayName ?? "No verified profile"}
                </div>
              </div>
              <Separator />
              <p className="text-muted-foreground text-xs leading-5">
                Instances require a verified Microsoft profile. Automatic
                profile selection uses the first verified account in Profiles.
              </p>
            </CardContent>
          </Card>

          {!selectedProfile ? (
            <Alert>
              <InfoIcon />
              <AlertTitle>Profile Required</AlertTitle>
              <AlertDescription>
                Save settings now if you need to, then add or verify a Microsoft
                profile before launching.
              </AlertDescription>
            </Alert>
          ) : null}

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
                  onClick={() => openExternalPath(path)}
                  size="sm"
                  variant="outline"
                >
                  <FolderOpenIcon data-icon="inline-start" />
                  {label}
                </Button>
              ))}
            </CardContent>
          </Card>

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
                onClick={() => setDeleteOpen(true)}
                variant="destructive"
              >
                <Trash2Icon data-icon="inline-start" />
                Delete Instance
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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
                onCheckedChange={setDeleteFiles}
                size="sm"
              />
              <div className="min-w-0">
                <div className="font-semibold text-sm">
                  Delete instance files
                </div>
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
                void handleDelete();
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
    </>
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

function RetryBox({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-muted px-2.5 py-1.5 text-sm">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <Button onClick={onRetry} size="xs" type="button" variant="outline">
        Retry
      </Button>
    </div>
  );
}
