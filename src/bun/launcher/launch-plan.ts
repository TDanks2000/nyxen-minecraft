import { existsSync, mkdirSync } from "node:fs";
import { release } from "node:os";
import { join, posix } from "node:path";
import type {
  CreateLaunchPlanInput,
  LauncherProfile,
  LaunchPlan,
  LaunchPlanMissingArtifact,
  MinecraftDownload,
  MinecraftLibrary,
  MinecraftVersionDetails,
} from "../../shared/types";
import { getJavaManagementMode } from "../settings/store";
import { getLauncherInstance } from "./instances";
import {
  getRequiredJavaVersion,
  type ManagedJavaRuntime,
  resolveManagedJavaRuntime,
} from "./java-runtimes";
import { ensureMicrosoftProfileLaunchAuth } from "./microsoft-auth";
import { type ResolvedModLoader, resolveModLoader } from "./mod-loaders";
import {
  ensureInstanceFolders,
  ensureLauncherDirectories,
  normalizeLauncherPathSegment,
} from "./paths";
import {
  getFirstVerifiedMicrosoftProfile,
  getLauncherProfile,
} from "./profiles";
import { joinArtifactPath, normalizeArtifactRelativePath } from "./validation";
import {
  getMinecraftVersionDetails,
  getMinecraftVersionSummary,
} from "./versions";

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type LaunchPlanOptions = {
  fetcher?: Fetcher;
  manifestCacheTtlMs?: number;
  javaRuntimeManifestUrl?: string;
  requestTimeoutMs?: number;
};

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

  return posix.join(
    ...group.split("."),
    artifact,
    version,
    `${artifact}-${version}${classifierSuffix}.${extension}`,
  );
};

const libraryArtifactPath = (
  library: MinecraftLibrary,
  download: MinecraftDownload | undefined,
): string | null => {
  const rawPath = download?.path ?? mavenPathFromName(library.name);

  return rawPath
    ? normalizeArtifactRelativePath(rawPath, `Library ${library.name}`)
    : null;
};

const libraryArtifactDownload = (
  library: MinecraftLibrary,
  download: MinecraftDownload | undefined,
): MinecraftDownload | undefined => {
  const path = libraryArtifactPath(library, download);

  if (!path) {
    return download;
  }

  if (download?.url) {
    return download;
  }

  if (!library.url) {
    return download;
  }

  try {
    const baseUrl = library.url.endsWith("/") ? library.url : `${library.url}/`;

    return {
      ...download,
      path,
      url: new URL(path, baseUrl).toString(),
    };
  } catch {
    return download;
  }
};

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
    try {
      return new RegExp(os.version).test(release());
    } catch {
      return false;
    }
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
    return getLauncherProfile(instanceProfileId);
  }

  return getFirstVerifiedMicrosoftProfile();
};

type EffectiveVersionDetails = Pick<
  MinecraftVersionDetails,
  "arguments" | "libraries" | "mainClass" | "minecraftArguments"
> & {
  id: string;
};

const mergeArgumentList = (
  base: Array<unknown> | undefined,
  loader: Array<unknown> | undefined,
): Array<unknown> | undefined => {
  if (!base && !loader) {
    return undefined;
  }

  return [...(base ?? []), ...(loader ?? [])];
};

const mergeModLoaderDetails = (
  versionDetails: MinecraftVersionDetails,
  loader: ResolvedModLoader | null,
): EffectiveVersionDetails => {
  if (!loader) {
    return versionDetails;
  }

  const mergedArguments =
    versionDetails.arguments || loader.arguments
      ? {
          game: mergeArgumentList(
            versionDetails.arguments?.game,
            loader.arguments?.game,
          ),
          jvm: mergeArgumentList(
            versionDetails.arguments?.jvm,
            loader.arguments?.jvm,
          ),
        }
      : undefined;

  const minecraftArguments = [
    versionDetails.minecraftArguments,
    loader.minecraftArguments,
  ]
    .filter((value): value is string => !!value)
    .join(" ");

  return {
    arguments: mergedArguments,
    id: loader.id,
    libraries: [...versionDetails.libraries, ...loader.libraries],
    mainClass: loader.mainClass ?? versionDetails.mainClass,
    minecraftArguments: minecraftArguments || undefined,
  };
};

export const createLaunchPlan = async (
  input: CreateLaunchPlanInput,
  options: LaunchPlanOptions = {},
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
  const versionDetails = await getMinecraftVersionDetails(
    {
      refresh: input.refreshVersionDetails,
      versionId: instance.versionId,
    },
    {
      fetcher: options.fetcher,
      requestTimeoutMs: options.requestTimeoutMs,
    },
  );
  const versionDetailsId = normalizeLauncherPathSegment(
    versionDetails.id,
    "Minecraft version id",
  );
  const modLoader = await resolveModLoader(instance, versionDetails, {
    fetcher: options.fetcher,
    requestTimeoutMs: options.requestTimeoutMs,
  });
  const launchDetails = mergeModLoaderDetails(versionDetails, modLoader);
  const launchVersionId = normalizeLauncherPathSegment(
    launchDetails.id,
    "Launch version id",
  );
  const directories = ensureLauncherDirectories();
  const instanceFolders = ensureInstanceFolders(instance.id);
  const nativesDirectory = join(
    directories.temp,
    "natives",
    instance.id,
    launchVersionId,
  );
  const missingArtifacts: Array<LaunchPlanMissingArtifact> = [];
  const nativeArtifactPaths: Array<string> = [];
  const warnings: Array<string> = [];
  const javaManagement = getJavaManagementMode();
  const requiredJava = getRequiredJavaVersion(versionDetails);
  let javaExecutable = instance.javaExecutable ?? "java";
  let managedRuntime: ManagedJavaRuntime | null = null;
  let assetIndexId: string | null = null;

  let profile: LauncherProfile | null = resolveProfile(
    input.profileId,
    instance.profileId,
  );

  try {
    profile = await ensureMicrosoftProfileLaunchAuth(profile);
  } catch (error) {
    if (profile && profile.kind !== "microsoft") {
      throw error;
    }

    profile = resolveProfile(input.profileId, instance.profileId);
    warnings.push(
      error instanceof Error ? error.message : "Profile authentication failed.",
    );
  }

  mkdirSync(instanceFolders.game, { recursive: true });
  mkdirSync(nativesDirectory, { recursive: true });
  mkdirSync(join(directories.assets, "indexes"), { recursive: true });

  if (javaManagement === "app-controlled") {
    managedRuntime = await resolveManagedJavaRuntime(requiredJava, {
      fetcher: options.fetcher,
      manifestCacheTtlMs: options.manifestCacheTtlMs,
      manifestUrl: options.javaRuntimeManifestUrl,
      requestTimeoutMs: options.requestTimeoutMs,
    });
    javaExecutable = managedRuntime.executable;

    if (instance.javaExecutable) {
      warnings.push(
        "Instance Java executable is ignored while app-controlled Java management is enabled.",
      );
    }

    missingArtifacts.push(...managedRuntime.missingArtifacts);
  }

  if (modLoader?.installerPath) {
    addMissingArtifact(missingArtifacts, {
      id: `${instance.loader}:${modLoader.version}:installer`,
      kind: "modLoaderInstaller",
      path: modLoader.installerPath,
      url: modLoader.installerUrl ?? undefined,
    });
  }

  const clientDownload = versionDetails.downloads?.client;
  const clientJarPath = join(
    directories.versions,
    versionDetailsId,
    `${versionDetailsId}.jar`,
  );

  addMissingArtifact(missingArtifacts, {
    id: `${versionDetailsId}:client`,
    kind: "clientJar",
    path: clientJarPath,
    sha1: clientDownload?.sha1,
    url: clientDownload?.url,
  });

  if (versionDetails.assetIndex) {
    assetIndexId = normalizeLauncherPathSegment(
      versionDetails.assetIndex.id,
      "Asset index id",
    );

    addMissingArtifact(missingArtifacts, {
      id: assetIndexId,
      kind: "assetIndex",
      path: join(directories.assets, "indexes", `${assetIndexId}.json`),
      sha1: versionDetails.assetIndex.sha1,
      url: versionDetails.assetIndex.url,
    });
  }

  const classpathLibraries: Array<string> = [];

  for (const library of launchDetails.libraries.filter(isLibraryAllowed)) {
    const artifact = libraryArtifactDownload(
      library,
      library.downloads?.artifact,
    );
    const artifactPath = libraryArtifactPath(library, artifact);

    if (artifactPath) {
      const fullPath = joinArtifactPath(
        directories.libraries,
        artifactPath,
        `Library ${library.name}`,
      );
      addMissingArtifact(missingArtifacts, {
        id: library.name,
        kind: "library",
        path: fullPath,
        sha1: artifact?.sha1,
        url: artifact?.url,
      });
      classpathLibraries.push(fullPath);
    }

    const classifierKey = nativeClassifierKey(library);
    const nativeArtifact = classifierKey
      ? libraryArtifactDownload(
          library,
          library.downloads?.classifiers?.[classifierKey],
        )
      : undefined;
    const nativePath = libraryArtifactPath(library, nativeArtifact);

    if (classifierKey && nativePath) {
      const fullNativePath = joinArtifactPath(
        directories.libraries,
        nativePath,
        `Native library ${library.name}`,
      );
      addMissingArtifact(missingArtifacts, {
        id: `${library.name}:${classifierKey}`,
        kind: "nativeLibrary",
        path: fullNativePath,
        sha1: nativeArtifact?.sha1,
        url: nativeArtifact?.url,
      });
      nativeArtifactPaths.push(fullNativePath);
    }
  }

  const classpath = [...classpathLibraries, clientJarPath];

  if (!launchDetails.mainClass) {
    warnings.push("Version metadata does not include a main class.");
  }

  if (versionSummary?.complianceLevel === 0) {
    warnings.push(
      "This Minecraft version is marked as legacy by Mojang metadata.",
    );
  }

  if (missingArtifacts.length > 0) {
    warnings.push(
      "Launch plan has missing artifacts that must be downloaded before launch.",
    );
  }

  return {
    arguments: {
      game: [
        ...(launchDetails.arguments?.game ??
          launchDetails.minecraftArguments?.split(" ") ??
          []),
        ...instance.gameArgs,
      ],
      jvm: [...(launchDetails.arguments?.jvm ?? []), ...instance.javaArgs],
    },
    classpath,
    createdAt: new Date().toISOString(),
    directories: {
      ...directories,
      game: instanceFolders.game,
      instance: instanceFolders.root,
      instanceCache: instanceFolders.cache,
      instanceConfig: instanceFolders.config,
      instanceLogs: instanceFolders.logs,
      instanceMetadata: instanceFolders.metadata,
      mods: instanceFolders.mods,
      natives: nativesDirectory,
      resourcePacks: instanceFolders.resourcePacks,
      saves: instanceFolders.saves,
      screenshots: instanceFolders.screenshots,
      shaderPacks: instanceFolders.shaderPacks,
    },
    instance,
    java: {
      component: requiredJava.component,
      executable: javaExecutable,
      management: javaManagement,
      majorVersion: requiredJava.majorVersion,
      memoryMaxMb: instance.memoryMaxMb,
      memoryMinMb: instance.memoryMinMb,
      runtimeDirectory: managedRuntime?.directory ?? null,
      runtimePlatform: managedRuntime?.platform ?? null,
      runtimeVersion: managedRuntime?.versionName ?? null,
    },
    legacyArgFormat: !launchDetails.arguments,
    minecraft: {
      assetIndexId,
      baseVersionId: versionDetailsId,
      mainClass: launchDetails.mainClass ?? null,
      versionId: launchVersionId,
    },
    missingArtifacts,
    modLoader: {
      installerPath: modLoader?.installerPath ?? null,
      installerUrl: modLoader?.installerUrl ?? null,
      kind: instance.loader,
      minecraftVersionId: versionDetailsId,
      version: modLoader?.version ?? null,
    },
    nativeArtifactPaths,
    profile,
    warnings,
  };
};
