import { randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix } from "node:path";
import { inflateRawSync } from "node:zlib";
import { z } from "zod";
import type {
  LauncherInstance,
  MinecraftLibrary,
  MinecraftVersionDetails,
  ModLoader,
} from "../../shared/types";
import {
  type LoaderVersionOptions,
  listLoaderVersions,
} from "./loader-versions";
import {
  ensurePrivateDirectory,
  ensurePrivateFile,
  getLauncherDirectories,
  normalizeLauncherPathSegment,
} from "./paths";

const FABRIC_META = "https://meta.fabricmc.net/v2";
const QUILT_META = "https://meta.quiltmc.org/v3";
const FORGE_MAVEN = "https://maven.minecraftforge.net";
const NEOFORGE_MAVEN = "https://maven.neoforged.net/releases";

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type ModLoaderResolutionOptions = {
  fetcher?: Fetcher;
  requestTimeoutMs?: number;
};

export type ResolvedModLoader = {
  arguments?: {
    game?: Array<unknown>;
    jvm?: Array<unknown>;
  };
  generatedLibraries: Array<MinecraftLibrary>;
  id: string;
  installerPath: string | null;
  installerUrl: string | null;
  libraries: Array<MinecraftLibrary>;
  mainClass?: string;
  minecraftArguments?: string;
  version: string;
};

const downloadSchema = z.object({
  path: z.string().optional(),
  sha1: z.string().optional(),
  size: z.number().int().optional(),
  url: z.string().optional(),
});

const librarySchema: z.ZodType<MinecraftLibrary> = z.object({
  downloads: z
    .object({
      artifact: downloadSchema.optional(),
      classifiers: z.record(z.string(), downloadSchema).optional(),
    })
    .optional(),
  name: z.string().min(1),
  natives: z.record(z.string(), z.string()).optional(),
  rules: z
    .array(
      z.object({
        action: z.string(),
        os: z
          .object({
            arch: z.string().optional(),
            name: z.string().optional(),
            version: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  url: z.string().optional(),
});

const loaderProfileSchema = z.object({
  arguments: z
    .object({
      game: z.array(z.unknown()).optional(),
      jvm: z.array(z.unknown()).optional(),
    })
    .optional(),
  id: z.string().min(1),
  libraries: z.array(librarySchema).optional(),
  mainClass: z.string().optional(),
  minecraftArguments: z.string().optional(),
});

const installProfileDataSchema = z
  .record(z.string(), z.record(z.string(), z.unknown()))
  .optional();

const installProfileSchema = z
  .object({
    data: installProfileDataSchema,
    versionInfo: loaderProfileSchema.optional(),
  })
  .passthrough();

const getRequestTimeoutMs = (
  options: ModLoaderResolutionOptions = {},
): number => {
  if (options.requestTimeoutMs !== undefined) {
    return Math.max(1, Math.trunc(options.requestTimeoutMs));
  }

  const configured = Number(process.env.NYXEN_LOADER_REQUEST_TIMEOUT_MS ?? "");

  if (!Number.isFinite(configured) || configured <= 0) {
    return 20_000;
  }

  return Math.max(1_000, Math.trunc(configured));
};

const assertHttpsUrl = (url: string, context: string): void => {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    throw new Error(`${context} URL must use HTTPS.`);
  }
};

const fetchWithTimeout = async (
  url: string,
  options: ModLoaderResolutionOptions,
): Promise<Response> => {
  assertHttpsUrl(url, "Mod loader metadata");

  const controller = new AbortController();
  const timeoutMs = getRequestTimeoutMs(options);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher = options.fetcher ?? fetch;

  try {
    return await fetcher(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Mod loader metadata request timed out after ${Math.round(
          timeoutMs / 1000,
        )} seconds.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const fetchJson = async (
  url: string,
  options: ModLoaderResolutionOptions,
): Promise<unknown> => {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    throw new Error(
      `Mod loader metadata request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

const writeFileAtomic = (path: string, data: Uint8Array): void => {
  ensurePrivateDirectory(dirname(path));

  const tempPath = `${path}.write-${process.pid}-${randomUUID()}.tmp`;

  try {
    writeFileSync(tempPath, data, { flag: "wx" });
    ensurePrivateFile(tempPath);
    renameSync(tempPath, path);
    ensurePrivateFile(path);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }
};

const fetchBinary = async (
  url: string,
  path: string,
  options: ModLoaderResolutionOptions,
): Promise<Uint8Array> => {
  if (existsSync(path)) {
    return new Uint8Array(readFileSync(path));
  }

  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    throw new Error(
      `Mod loader installer request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = new Uint8Array(await response.arrayBuffer());
  writeFileAtomic(path, data);

  return data;
};

const encodePathSegment = (value: string): string =>
  encodeURIComponent(value).replaceAll("%2B", "+");

const normalizeLoaderVersion = (loader: ModLoader, version: string): string =>
  normalizeLauncherPathSegment(version, `${loader} loader version`);

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

const artifactNameFromInstallProfileValue = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const unwrapped =
    normalized.startsWith("[") && normalized.endsWith("]")
      ? normalized.slice(1, -1)
      : normalized;

  return mavenPathFromName(unwrapped) ? unwrapped : null;
};

const generatedClientLibraryFromInstallProfile = (
  installProfile: z.infer<typeof installProfileSchema>,
): MinecraftLibrary | null => {
  const name = artifactNameFromInstallProfileValue(
    installProfile.data?.PATCHED?.client,
  );
  const path = name ? mavenPathFromName(name) : null;

  if (!name || !path) {
    return null;
  }

  return {
    downloads: {
      artifact: {
        path,
        url: "",
      },
    },
    name,
  };
};

const generatedClientLibrariesFromInstallProfile = (
  libraries: Array<MinecraftLibrary>,
  generatedClientLibrary: MinecraftLibrary | null,
): Array<MinecraftLibrary> => {
  if (!generatedClientLibrary?.downloads?.artifact?.path) {
    return [];
  }

  const generatedPath = generatedClientLibrary.downloads.artifact.path;
  const alreadyListed = libraries.some(
    (library) =>
      library.name === generatedClientLibrary.name ||
      library.downloads?.artifact?.path === generatedPath,
  );

  return alreadyListed ? [] : [generatedClientLibrary];
};

const resolveLoaderVersion = async (
  instance: LauncherInstance,
  options: ModLoaderResolutionOptions,
): Promise<string> => {
  if (instance.loaderVersion?.trim()) {
    return normalizeLoaderVersion(instance.loader, instance.loaderVersion);
  }

  const versions = await listLoaderVersions(
    {
      loader: instance.loader,
      mcVersion: instance.versionId,
    },
    options satisfies LoaderVersionOptions,
  );
  const selected = versions.find((version) => version.stable) ?? versions[0];

  if (!selected) {
    throw new Error(
      `No ${instance.loader} loader versions are available for Minecraft ${instance.versionId}.`,
    );
  }

  return normalizeLoaderVersion(instance.loader, selected.id);
};

const resolveJsonLoader = async (
  loader: Extract<ModLoader, "fabric" | "quilt">,
  minecraftVersionId: string,
  loaderVersion: string,
  options: ModLoaderResolutionOptions,
): Promise<ResolvedModLoader> => {
  const baseUrl = loader === "fabric" ? FABRIC_META : QUILT_META;
  const profile = loaderProfileSchema.parse(
    await fetchJson(
      `${baseUrl}/versions/loader/${encodePathSegment(
        minecraftVersionId,
      )}/${encodePathSegment(loaderVersion)}/profile/json`,
      options,
    ),
  );

  return {
    arguments: profile.arguments,
    generatedLibraries: [],
    id: normalizeLauncherPathSegment(profile.id, `${loader} profile id`),
    installerPath: null,
    installerUrl: null,
    libraries: profile.libraries ?? [],
    mainClass: profile.mainClass,
    minecraftArguments: profile.minecraftArguments,
    version: loaderVersion,
  };
};

const installerFileName = (
  loader: Extract<ModLoader, "forge" | "neoforge">,
  minecraftVersionId: string,
  loaderVersion: string,
): string => {
  const id =
    loader === "forge"
      ? `${minecraftVersionId}-${loaderVersion}`
      : loaderVersion;

  return `${loader}-${id}-installer.jar`;
};

const installerStoragePath = (
  loader: Extract<ModLoader, "forge" | "neoforge">,
  minecraftVersionId: string,
  loaderVersion: string,
): string => {
  const directories = getLauncherDirectories();

  return join(
    directories.downloads,
    "loaders",
    loader,
    normalizeLauncherPathSegment(minecraftVersionId, "Minecraft version id"),
    normalizeLoaderVersion(loader, loaderVersion),
    installerFileName(loader, minecraftVersionId, loaderVersion),
  );
};

const forgeInstallerUrl = (
  minecraftVersionId: string,
  loaderVersion: string,
): string => {
  const forgeVersion = `${minecraftVersionId}-${loaderVersion}`;

  return `${FORGE_MAVEN}/net/minecraftforge/forge/${encodePathSegment(
    forgeVersion,
  )}/forge-${encodePathSegment(forgeVersion)}-installer.jar`;
};

const neoForgeInstallerUrl = (loaderVersion: string): string =>
  `${NEOFORGE_MAVEN}/net/neoforged/neoforge/${encodePathSegment(
    loaderVersion,
  )}/neoforge-${encodePathSegment(loaderVersion)}-installer.jar`;

const findEndOfCentralDirectory = (archive: Buffer): number => {
  const minimumOffset = Math.max(0, archive.length - 65_557);

  for (let offset = archive.length - 22; offset >= minimumOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Mod loader installer is not a valid ZIP archive.");
};

const readZipEntry = (
  archiveData: Uint8Array,
  entryName: string,
): Buffer | null => {
  const archive = Buffer.from(archiveData);
  const endOffset = findEndOfCentralDirectory(archive);
  const totalEntries = archive.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = archive.readUInt32LE(endOffset + 16);
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Mod loader installer ZIP central directory is invalid.");
    }

    const compressionMethod = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const fileNameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const fileName = archive
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");

    if (fileName === entryName) {
      if (archive.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error("Mod loader installer ZIP local header is invalid.");
      }

      const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
      const dataStart =
        localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedData = archive.subarray(
        dataStart,
        dataStart + compressedSize,
      );

      if (compressionMethod === 0) {
        return Buffer.from(compressedData);
      }

      if (compressionMethod === 8) {
        return inflateRawSync(compressedData);
      }

      throw new Error(
        `Unsupported compression method ${compressionMethod} in mod loader installer.`,
      );
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return null;
};

const readZipJson = (
  archive: Uint8Array,
  entryName: string,
): unknown | null => {
  const entry = readZipEntry(archive, entryName);

  return entry ? JSON.parse(entry.toString("utf8")) : null;
};

const resolveInstallerLoader = async (
  loader: Extract<ModLoader, "forge" | "neoforge">,
  minecraftVersionId: string,
  loaderVersion: string,
  options: ModLoaderResolutionOptions,
): Promise<ResolvedModLoader> => {
  const installerUrl =
    loader === "forge"
      ? forgeInstallerUrl(minecraftVersionId, loaderVersion)
      : neoForgeInstallerUrl(loaderVersion);
  const installerPath = installerStoragePath(
    loader,
    minecraftVersionId,
    loaderVersion,
  );
  const archive = await fetchBinary(installerUrl, installerPath, options);
  const versionProfile = readZipJson(archive, "version.json");
  const installProfile = installProfileSchema.parse(
    readZipJson(archive, "install_profile.json") ?? {},
  );
  const profile = loaderProfileSchema.parse(
    versionProfile ?? installProfile.versionInfo,
  );
  const libraries = profile.libraries ?? [];
  const generatedLibraries = generatedClientLibrariesFromInstallProfile(
    libraries,
    generatedClientLibraryFromInstallProfile(installProfile),
  );

  return {
    arguments: profile.arguments,
    generatedLibraries,
    id: normalizeLauncherPathSegment(profile.id, `${loader} profile id`),
    installerPath,
    installerUrl,
    libraries,
    mainClass: profile.mainClass,
    minecraftArguments: profile.minecraftArguments,
    version: loaderVersion,
  };
};

export const resolveModLoader = async (
  instance: LauncherInstance,
  versionDetails: Pick<MinecraftVersionDetails, "id">,
  options: ModLoaderResolutionOptions = {},
): Promise<ResolvedModLoader | null> => {
  if (instance.loader === "vanilla") {
    return null;
  }

  const minecraftVersionId = normalizeLauncherPathSegment(
    versionDetails.id,
    "Minecraft version id",
  );
  const loaderVersion = await resolveLoaderVersion(instance, options);

  switch (instance.loader) {
    case "fabric":
    case "quilt":
      return resolveJsonLoader(
        instance.loader,
        minecraftVersionId,
        loaderVersion,
        options,
      );
    case "forge":
    case "neoforge":
      return resolveInstallerLoader(
        instance.loader,
        minecraftVersionId,
        loaderVersion,
        options,
      );
    default:
      return null;
  }
};
