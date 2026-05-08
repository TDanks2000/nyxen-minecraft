import { existsSync, mkdirSync } from "node:fs";
import { release } from "node:os";
import { join } from "node:path";
import type {
  CreateLaunchPlanInput,
  LauncherProfile,
  LaunchPlan,
  LaunchPlanMissingArtifact,
  MinecraftDownload,
  MinecraftLibrary,
} from "../../shared/types";
import { getLauncherInstance } from "./instances";
import { ensureLauncherDirectories } from "./paths";
import { getFirstLauncherProfile, getLauncherProfile } from "./profiles";
import {
  getMinecraftVersionDetails,
  getMinecraftVersionSummary,
} from "./versions";

const minecraftOsName = (): "linux" | "osx" | "windows" => {
  if (process.platform === "darwin") {
    return "osx";
  }

  if (process.platform === "win32") {
    return "windows";
  }

  return "linux";
};

const mavenPathFromName = (name: string): string | null => {
  const [coordinates, extension = "jar"] = name.split("@");
  const parts = coordinates?.split(":") ?? [];

  if (parts.length < 3 || parts.length > 4) {
    return null;
  }

  const [group, artifact, version, classifier] = parts;

  if (!group || !artifact || !version) {
    return null;
  }

  const classifierSuffix = classifier ? `-${classifier}` : "";

  return join(
    ...group.split("."),
    artifact,
    version,
    `${artifact}-${version}${classifierSuffix}.${extension}`,
  );
};

const libraryArtifactPath = (
  library: MinecraftLibrary,
  download: MinecraftDownload | undefined,
): string | null => download?.path ?? mavenPathFromName(library.name);

const isOsMatch = (
  os: { arch?: string; name?: string; version?: string } | undefined,
): boolean => {
  if (!os) {
    return true;
  }

  if (os.name && os.name !== minecraftOsName()) {
    return false;
  }

  if (os.arch && os.arch !== process.arch) {
    return false;
  }

  if (os.version) {
    return new RegExp(os.version).test(release());
  }

  return true;
};

const isLibraryAllowed = (library: MinecraftLibrary): boolean => {
  if (!library.rules || library.rules.length === 0) {
    return true;
  }

  let allowed = false;

  for (const rule of library.rules) {
    if (isOsMatch(rule.os)) {
      allowed = rule.action === "allow";
    }
  }

  return allowed;
};

const nativeClassifierKey = (library: MinecraftLibrary): string | null => {
  const nativeTemplate = library.natives?.[minecraftOsName()];
  const archPlaceholder = "$" + "{arch}";

  if (!nativeTemplate) {
    return null;
  }

  return nativeTemplate.replace(
    archPlaceholder,
    process.arch === "x64" ? "64" : "32",
  );
};

const addMissingArtifact = (
  missingArtifacts: Array<LaunchPlanMissingArtifact>,
  artifact: LaunchPlanMissingArtifact,
): void => {
  if (!existsSync(artifact.path)) {
    missingArtifacts.push(artifact);
  }
};

const resolveProfile = (
  requestedProfileId: string | undefined,
  instanceProfileId: string | null,
): LauncherProfile | null => {
  if (requestedProfileId?.trim()) {
    const profile = getLauncherProfile(requestedProfileId);

    if (!profile) {
      throw new Error("Selected launcher profile does not exist.");
    }

    return profile;
  }

  if (instanceProfileId) {
    return getLauncherProfile(instanceProfileId) ?? getFirstLauncherProfile();
  }

  return getFirstLauncherProfile();
};

export const createLaunchPlan = async (
  input: CreateLaunchPlanInput,
): Promise<LaunchPlan> => {
  const instanceId = input.instanceId.trim();

  if (!instanceId) {
    throw new Error("Launcher instance id is required.");
  }

  const instance = getLauncherInstance(instanceId);

  if (!instance) {
    throw new Error("Launcher instance does not exist.");
  }

  const versionSummary = getMinecraftVersionSummary(instance.versionId);
  const versionDetails = await getMinecraftVersionDetails({
    refresh: input.refreshVersionDetails,
    versionId: instance.versionId,
  });
  const directories = ensureLauncherDirectories();
  const nativesDirectory = join(
    directories.temp,
    "natives",
    instance.id,
    versionDetails.id,
  );
  const profile = resolveProfile(input.profileId, instance.profileId);
  const missingArtifacts: Array<LaunchPlanMissingArtifact> = [];
  const warnings: Array<string> = [];

  mkdirSync(instance.gameDirectory, { recursive: true });
  mkdirSync(nativesDirectory, { recursive: true });
  mkdirSync(join(directories.assets, "indexes"), { recursive: true });

  const clientDownload = versionDetails.downloads?.client;
  const clientJarPath = join(
    directories.versions,
    versionDetails.id,
    `${versionDetails.id}.jar`,
  );

  addMissingArtifact(missingArtifacts, {
    id: `${versionDetails.id}:client`,
    kind: "clientJar",
    path: clientJarPath,
    sha1: clientDownload?.sha1,
    url: clientDownload?.url,
  });

  if (versionDetails.assetIndex) {
    addMissingArtifact(missingArtifacts, {
      id: versionDetails.assetIndex.id,
      kind: "assetIndex",
      path: join(
        directories.assets,
        "indexes",
        `${versionDetails.assetIndex.id}.json`,
      ),
      sha1: versionDetails.assetIndex.sha1,
      url: versionDetails.assetIndex.url,
    });
  }

  for (const library of versionDetails.libraries.filter(isLibraryAllowed)) {
    const artifact = library.downloads?.artifact;
    const artifactPath = libraryArtifactPath(library, artifact);

    if (artifactPath) {
      addMissingArtifact(missingArtifacts, {
        id: library.name,
        kind: "library",
        path: join(directories.libraries, artifactPath),
        sha1: artifact?.sha1,
        url: artifact?.url,
      });
    }

    const classifierKey = nativeClassifierKey(library);
    const nativeArtifact = classifierKey
      ? library.downloads?.classifiers?.[classifierKey]
      : undefined;
    const nativePath = libraryArtifactPath(library, nativeArtifact);

    if (classifierKey && nativePath) {
      addMissingArtifact(missingArtifacts, {
        id: `${library.name}:${classifierKey}`,
        kind: "nativeLibrary",
        path: join(directories.libraries, nativePath),
        sha1: nativeArtifact?.sha1,
        url: nativeArtifact?.url,
      });
    }
  }

  if (!profile) {
    warnings.push("No launcher profile exists yet.");
  }

  if (!versionDetails.mainClass) {
    warnings.push("Version metadata does not include a main class.");
  }

  if (versionSummary?.complianceLevel === 0) {
    warnings.push(
      "This Minecraft version is marked as legacy by Mojang metadata.",
    );
  }

  if (instance.loader !== "vanilla") {
    warnings.push("Mod loader resolution is not implemented yet.");
  }

  if (missingArtifacts.length > 0) {
    warnings.push(
      "Launch plan has missing artifacts that must be downloaded before launch.",
    );
  }

  return {
    arguments: {
      game: [
        ...(versionDetails.arguments?.game ??
          versionDetails.minecraftArguments?.split(" ") ??
          []),
        ...instance.gameArgs,
      ],
      jvm: [...(versionDetails.arguments?.jvm ?? []), ...instance.javaArgs],
    },
    createdAt: new Date().toISOString(),
    directories: {
      ...directories,
      game: instance.gameDirectory,
      natives: nativesDirectory,
    },
    instance,
    java: {
      executable: instance.javaExecutable ?? "java",
      memoryMaxMb: instance.memoryMaxMb,
      memoryMinMb: instance.memoryMinMb,
    },
    minecraft: {
      assetIndexId: versionDetails.assetIndex?.id ?? null,
      mainClass: versionDetails.mainClass ?? null,
      versionId: versionDetails.id,
    },
    missingArtifacts,
    profile,
    warnings,
  };
};
