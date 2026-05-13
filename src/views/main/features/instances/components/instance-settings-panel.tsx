import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  InstanceFileEntry,
  LauncherInstance,
  ModLoader,
} from "@/shared/types";
import { InstanceCompatibilityAlert } from "@/views/main/features/instances/components/instance-compatibility-alert";
import { InstanceDangerZoneCard } from "@/views/main/features/instances/components/instance-danger-zone-card";
import { InstanceDeleteDialog } from "@/views/main/features/instances/components/instance-delete-dialog";
import { InstanceFoldersCard } from "@/views/main/features/instances/components/instance-folders-card";
import { InstanceIdentitySettingsCard } from "@/views/main/features/instances/components/instance-identity-settings-card";
import { InstanceLaunchArgumentsCard } from "@/views/main/features/instances/components/instance-launch-arguments-card";
import { InstancePerformanceCard } from "@/views/main/features/instances/components/instance-performance-card";
import { InstanceProfileStatusCard } from "@/views/main/features/instances/components/instance-profile-status-card";
import { InstanceSettingsActionBar } from "@/views/main/features/instances/components/instance-settings-action-bar";
import { InstanceSettingsFlowStrip } from "@/views/main/features/instances/components/instance-settings-flow-strip";
import {
  AUTO_PROFILE_VALUE,
  getClosestRamIndex,
  INSTANCE_SETTINGS_LOADERS,
  INSTANCE_SETTINGS_RAM_STOPS,
  isVerifiedMinecraftProfile,
  parseArgLines,
} from "@/views/main/features/instances/components/instance-settings-model";
import { useLoaderVersions } from "@/views/main/hooks/use-loader-versions";
import { useProfiles } from "@/views/main/hooks/use-profiles";
import { useSettings } from "@/views/main/hooks/use-settings";
import { useVersions } from "@/views/main/hooks/use-versions";
import { rpc } from "@/views/main/lib/rpc";

type InstanceSettingsPanelProps = {
  instance: LauncherInstance;
  mods: Array<InstanceFileEntry>;
  onInstanceDeleted: (instanceId: string) => void;
  onInstanceUpdated: (instance: LauncherInstance) => void;
  onReviewMods: () => void;
};

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
    const stops = [...INSTANCE_SETTINGS_RAM_STOPS];
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
    INSTANCE_SETTINGS_LOADERS.find((option) => option.value === loader)
      ?.label ?? loader;
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
        const stops = INSTANCE_SETTINGS_RAM_STOPS.filter((mb) => mb <= totalMb);
        if (!stops.includes(instance.memoryMaxMb)) {
          stops.push(instance.memoryMaxMb);
        }
        if (stops.length === 0) {
          stops.push(INSTANCE_SETTINGS_RAM_STOPS[0] ?? 512);
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
      <InstanceSettingsFlowStrip blocked={requiresCompatibilityConfirmation} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <InstanceIdentitySettingsCard
            autoProfile={autoProfile}
            bannerUrl={bannerUrl}
            iconUrl={iconUrl}
            loader={loader}
            loaderLabel={loaderLabel}
            loaderNeedsVersion={loaderNeedsVersion}
            loaderSelectionUnavailable={loaderSelectionUnavailable}
            loaderVersion={loaderVersion}
            loaderVersionComplete={loaderVersionComplete}
            loaderVersionOptions={loaderVersionOptions}
            loaderVersionsError={loaderVersions.error}
            loaderVersionsLoading={loaderVersions.loading}
            name={name}
            nameValid={nameValid}
            onBannerUrlChange={setBannerUrl}
            onIconUrlChange={setIconUrl}
            onLoaderChange={(nextLoader) => {
              setLoader(nextLoader);
              setLoaderVersion("");
            }}
            onLoaderVersionChange={setLoaderVersion}
            onNameChange={setName}
            onProfileValueChange={setProfileValue}
            onRefreshLoaderVersions={loaderVersions.refresh}
            onRefreshVersions={versions.refresh}
            onRefreshVersionsManifest={versions.refreshManifest}
            onVersionChange={(nextVersionId) => {
              setVersionId(nextVersionId);
              setLoaderVersion("");
            }}
            profileCopy={profileCopy}
            profileValue={profileValue}
            selectedProfile={selectedProfile}
            unverifiedProfiles={unverifiedProfiles}
            verifiedProfiles={verifiedProfiles}
            versionId={versionId}
            versionLookupError={versions.error}
            versionValid={versionValid}
            versions={versions.data}
            versionsEmpty={versionsEmpty}
            versionsLoading={versions.loading}
          />

          {requiresCompatibilityConfirmation ? (
            <InstanceCompatibilityAlert
              compatibilityConfirmed={compatibilityConfirmed}
              instance={instance}
              loader={loader}
              localModCount={localModCount}
              nextLoaderVersion={nextLoaderVersion}
              onCompatibilityConfirmedChange={setCompatibilityConfirmed}
              onKeepCurrentRuntime={keepCurrentRuntime}
              onReviewMods={onReviewMods}
              versionId={versionId}
            />
          ) : null}

          <InstancePerformanceCard
            memoryMaxMb={memoryMaxMb}
            memoryMinMb={memoryMinMb}
            memoryMinValid={memoryMinValid}
            onMemoryMinMbChange={setMemoryMinMb}
            onRamIndexChange={setRamIndex}
            ramIndex={ramIndex}
            ramStops={ramStops}
          />

          <InstanceLaunchArgumentsCard
            gameArgsText={gameArgsText}
            javaArgsText={javaArgsText}
            javaExecutable={javaExecutable}
            onGameArgsTextChange={setGameArgsText}
            onJavaArgsTextChange={setJavaArgsText}
            onJavaExecutableChange={setJavaExecutable}
          />

          <InstanceSettingsActionBar
            canSave={canSave}
            onReset={resetForm}
            onSave={() => void handleSave()}
            saving={saving}
          />
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <InstanceProfileStatusCard selectedProfile={selectedProfile} />
          <InstanceFoldersCard instance={instance} />
          <InstanceDangerZoneCard onDeleteClick={() => setDeleteOpen(true)} />
        </aside>
      </div>

      <InstanceDeleteDialog
        deleteFiles={deleteFiles}
        deleting={deleting}
        instance={instance}
        onDelete={() => void handleDelete()}
        onDeleteFilesChange={setDeleteFiles}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
      />
    </>
  );
}
