import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import type {
  CurseForgeProjectSection,
  LauncherDirectories,
  LaunchPlan,
} from "../src/shared/types";

const manifestDocument = {
  latest: {
    release: "1.20.4",
    snapshot: "24w01a",
  },
  versions: [
    {
      complianceLevel: 1,
      id: "1.20.4",
      releaseTime: "2023-12-07T12:00:00+00:00",
      sha1: "version-sha",
      time: "2023-12-07T12:00:00+00:00",
      type: "release",
      url: "https://metadata.test/versions/1.20.4.json",
    },
    {
      complianceLevel: 1,
      id: "24w01a",
      releaseTime: "2024-01-03T12:00:00+00:00",
      sha1: "snapshot-sha",
      time: "2024-01-03T12:00:00+00:00",
      type: "snapshot",
      url: "https://metadata.test/versions/24w01a.json",
    },
  ],
};

const authPlayerNamePlaceholder = "$" + "{auth_player_name}";
const authXuidPlaceholder = "$" + "{auth_xuid}";
const classpathPlaceholder = "$" + "{classpath}";
const classpathSeparatorPlaceholder = "$" + "{classpath_separator}";
const clientIdPlaceholder = "$" + "{clientid}";
const libraryDirectoryPlaceholder = "$" + "{library_directory}";
const nativesDirectoryPlaceholder = "$" + "{natives_directory}";
const versionNamePlaceholder = "$" + "{version_name}";

const versionDetailsDocument = {
  arguments: {
    game: [
      "--username",
      authPlayerNamePlaceholder,
      "--version",
      versionNamePlaceholder,
    ],
    jvm: [`-Djava.library.path=${nativesDirectoryPlaceholder}`],
  },
  assetIndex: {
    id: "12",
    sha1: "asset-index-sha",
    url: "https://resources.download.minecraft.net/indexes/12.json",
  },
  downloads: {
    client: {
      sha1: "client-sha",
      size: 123,
      url: "https://launcher.mojang.com/v1/objects/client/client.jar",
    },
  },
  id: "1.20.4",
  javaVersion: {
    component: "java-runtime-gamma",
    majorVersion: 17,
  },
  libraries: [
    {
      downloads: {
        artifact: {
          path: "com/mojang/brigadier/1.0.18/brigadier-1.0.18.jar",
          sha1: "library-sha",
          url: "https://libraries.minecraft.net/com/mojang/brigadier/1.0.18/brigadier-1.0.18.jar",
        },
      },
      name: "com.mojang:brigadier:1.0.18",
    },
  ],
  mainClass: "net.minecraft.client.main.Main",
  type: "release",
};

const assetObjectContents = "asset-object";
const assetObjectHash = "f47d05104830672da359af5552897d84f1b7e8d6";
const assetIndexDocument = {
  objects: {
    "minecraft/textures/gui/title/background/panorama_1.png": {
      hash: assetObjectHash,
      size: assetObjectContents.length,
    },
  },
};

const minecraftProfileDocument = {
  capes: [],
  id: "986dec87b7ec47ff89ff033fdb95c4b5",
  name: "NyxenDev",
  skins: [
    {
      id: "6a6e65e5-76dd-4c3c-a625-162924514568",
      state: "ACTIVE",
      url: "https://textures.minecraft.net/texture/test",
      variant: "CLASSIC",
    },
  ],
};

const jsonResponse = (document: unknown, status = 200): Response =>
  new Response(JSON.stringify(document), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });

const createFakeFetch =
  (
    entitlementItems: Array<{ name: string; signature: string }> = [
      { name: "product_minecraft", signature: "product-signature" },
      { name: "game_minecraft", signature: "game-signature" },
    ],
  ) =>
  async (input: string | URL | Request): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString();

    if (url.endsWith("version_manifest_v2.json")) {
      return jsonResponse(manifestDocument);
    }

    if (url.endsWith("/1.20.4.json")) {
      return jsonResponse(versionDetailsDocument);
    }

    if (url.endsWith("/devicecode")) {
      return jsonResponse({
        device_code: "device-code",
        expires_in: 900,
        interval: 5,
        message: "Use device-code at Microsoft.",
        user_code: "ABCD-EFGH",
        verification_uri: "https://www.microsoft.com/link",
      });
    }

    if (url.endsWith("/token")) {
      return jsonResponse({
        access_token: "microsoft-access-token",
        expires_in: 3600,
        refresh_token: "microsoft-refresh-token",
        token_type: "Bearer",
      });
    }

    if (url === "https://user.auth.xboxlive.com/user/authenticate") {
      return jsonResponse({
        DisplayClaims: {
          xui: [{ uhs: "user-hash" }],
        },
        Token: "xbox-token",
      });
    }

    if (url === "https://xsts.auth.xboxlive.com/xsts/authorize") {
      return jsonResponse({
        DisplayClaims: {
          xui: [{ uhs: "user-hash" }],
        },
        Token: "xsts-token",
      });
    }

    if (
      url === "https://api.minecraftservices.com/authentication/login_with_xbox"
    ) {
      return jsonResponse({
        access_token: "minecraft-access-token",
        expires_in: 86_400,
        token_type: "Bearer",
        username: "not-the-player-uuid",
      });
    }

    if (url === "https://api.minecraftservices.com/entitlements/mcstore") {
      return jsonResponse({
        items: entitlementItems,
        keyId: "1",
        signature: "entitlement-signature",
      });
    }

    if (url === "https://api.minecraftservices.com/minecraft/profile") {
      return jsonResponse(minecraftProfileDocument);
    }

    return new Response("not found", {
      status: 404,
      statusText: "Not Found",
    });
  };

const fakeFetch = createFakeFetch();

const fakeUnsupportedDeviceCodeFetch = async (
  input: string | URL | Request,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (url.endsWith("/devicecode")) {
    return new Response(
      JSON.stringify({
        error: "invalid_client",
        error_codes: [70002],
        error_description:
          "AADSTS70002: The provided client is not supported for this feature. The client application must be marked as 'mobile.'",
      }),
      {
        headers: {
          "content-type": "application/json",
        },
        status: 400,
      },
    );
  }

  return fakeFetch(input);
};

const fakeHangingFetch = (): Promise<Response> =>
  new Promise<Response>(() => {});

const fakeHangingOwnershipFetch = async (
  input: string | URL | Request,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (url === "https://api.minecraftservices.com/entitlements/mcstore") {
    return new Promise<Response>(() => {});
  }

  return fakeFetch(input);
};

const fakeInvalidMinecraftAppRegistrationFetch = async (
  input: string | URL | Request,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (
    url === "https://api.minecraftservices.com/authentication/login_with_xbox"
  ) {
    return jsonResponse(
      {
        errorMessage:
          "Invalid app registration, see https://aka.ms/AppRegInfo for more information",
        path: "/authentication/login_with_xbox",
      },
      403,
    );
  }

  return fakeFetch(input);
};

const currentJavaRuntimePlatform = (): string => {
  if (process.platform === "win32") {
    if (process.arch === "arm64") return "windows-arm64";
    if (process.arch === "ia32") {
      return "windows-x86";
    }
    return "windows-x64";
  }

  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "mac-os-arm64" : "mac-os";
  }

  return process.arch === "ia32" ? "linux-i386" : "linux";
};

const runtimeExecutablePath =
  process.platform === "win32" ? "bin/javaw.exe" : "bin/java";

const normalizePathForAssertion = (path: string): string =>
  path.replaceAll("\\", "/");

const runtimeEntryDocument = ({
  manifestUrl = "https://runtime.test/java-runtime-gamma/manifest.json",
  released = "2024-01-04T00:00:00+00:00",
  versionName = "17.0.1",
}: {
  manifestUrl?: string;
  released?: string;
  versionName?: string;
} = {}) => ({
  manifest: {
    url: manifestUrl,
  },
  version: {
    name: versionName,
    released,
  },
});

const runtimeAllDocument = (entries = [runtimeEntryDocument()]) => ({
  [currentJavaRuntimePlatform()]: {
    "java-runtime-gamma": entries,
  },
});

const runtimePackageManifestDocument = () => ({
  files: {
    bin: {
      type: "directory",
    },
    [runtimeExecutablePath]: {
      downloads: {
        raw: {
          url: "https://runtime.test/java-runtime-gamma/bin/java",
        },
      },
      executable: true,
      type: "file",
    },
    "lib/modules": {
      downloads: {
        raw: {
          url: "https://runtime.test/java-runtime-gamma/lib/modules",
        },
      },
      executable: false,
      type: "file",
    },
  },
});

const fakeRuntimeFetch = async (
  input: string | URL | Request,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (
    url.endsWith(
      "/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json",
    )
  ) {
    return jsonResponse(runtimeAllDocument());
  }

  if (url === "https://runtime.test/java-runtime-gamma/manifest.json") {
    return jsonResponse(runtimePackageManifestDocument());
  }

  return fakeFetch(input);
};

const fabricProfileDocument = {
  id: "fabric-loader-0.15.7-1.20.4",
  libraries: [
    {
      name: "net.fabricmc:fabric-loader:0.15.7",
      url: "https://maven.fabricmc.net/",
    },
    {
      name: "net.fabricmc:intermediary:1.20.4",
      url: "https://maven.fabricmc.net/",
    },
  ],
  mainClass: "net.fabricmc.loader.impl.launch.knot.KnotClient",
};

const fakeFabricFetch = async (
  input: string | URL | Request,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (
    url ===
    "https://meta.fabricmc.net/v2/versions/loader/1.20.4/0.15.7/profile/json"
  ) {
    return jsonResponse(fabricProfileDocument);
  }

  return fakeFetch(input);
};

const quiltProfileDocument = {
  id: "quilt-loader-0.26.4-1.20.4",
  libraries: [
    {
      name: "org.quiltmc:quilt-loader:0.26.4",
      url: "https://maven.quiltmc.org/repository/release/",
    },
  ],
  mainClass: "org.quiltmc.loader.impl.launch.knot.KnotClient",
};

const fakeQuiltFetch = async (
  input: string | URL | Request,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (
    url ===
    "https://meta.quiltmc.org/v3/versions/loader/1.20.4/0.26.4/profile/json"
  ) {
    return jsonResponse(quiltProfileDocument);
  }

  return fakeFetch(input);
};

const createStoredZip = (
  entries: Record<string, string | Uint8Array>,
): Uint8Array => {
  const localParts: Array<Buffer> = [];
  const centralParts: Array<Buffer> = [];
  let offset = 0;

  for (const [name, content] of Object.entries(entries)) {
    const nameBuffer = Buffer.from(name, "utf8");
    const contentBuffer =
      typeof content === "string"
        ? Buffer.from(content, "utf8")
        : Buffer.from(content);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(contentBuffer.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(0, 12);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(contentBuffer.length, 20);
    centralHeader.writeUInt32LE(contentBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, nameBuffer, contentBuffer);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + contentBuffer.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return new Uint8Array(Buffer.concat([...localParts, centralDirectory, end]));
};

const forgeVersionDocument = {
  id: "1.20.4-forge-49.0.50",
  libraries: [
    {
      downloads: {
        artifact: {
          path: "net/minecraftforge/forge/1.20.4-49.0.50/forge-1.20.4-49.0.50-client.jar",
          sha1: "generated-sha",
          url: "",
        },
      },
      name: "net.minecraftforge:forge:1.20.4-49.0.50:client",
    },
    {
      downloads: {
        artifact: {
          path: "net/minecraftforge/bootstrap/1.0/bootstrap-1.0.jar",
          url: "https://maven.minecraftforge.net/net/minecraftforge/bootstrap/1.0/bootstrap-1.0.jar",
        },
      },
      name: "net.minecraftforge:bootstrap:1.0",
    },
  ],
  mainClass: "net.minecraftforge.bootstrap.ForgeBootstrap",
};

const neoForgeVersionDocument = {
  id: "1.20.4-neoforge-20.4.237",
  libraries: [
    {
      downloads: {
        artifact: {
          path: "net/neoforged/neoforge/20.4.237/neoforge-20.4.237-client.jar",
          url: "",
        },
      },
      name: "net.neoforged:neoforge:20.4.237:client",
    },
  ],
  mainClass: "cpw.mods.bootstraplauncher.BootstrapLauncher",
};

const fakeForgeInstallerFetch = async (
  input: string | URL | Request,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (
    url ===
    "https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.4-49.0.50/forge-1.20.4-49.0.50-installer.jar"
  ) {
    const archive = createStoredZip({
      "install_profile.json": "{}",
      "version.json": JSON.stringify(forgeVersionDocument),
    });

    return new Response(
      archive.buffer.slice(
        archive.byteOffset,
        archive.byteOffset + archive.byteLength,
      ) as ArrayBuffer,
    );
  }

  return fakeFetch(input);
};

const fakeNeoForgeInstallerFetch = async (
  input: string | URL | Request,
): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (
    url ===
    "https://maven.neoforged.net/releases/net/neoforged/neoforge/20.4.237/neoforge-20.4.237-installer.jar"
  ) {
    const archive = createStoredZip({
      "install_profile.json": "{}",
      "version.json": JSON.stringify(neoForgeVersionDocument),
    });

    return new Response(
      archive.buffer.slice(
        archive.byteOffset,
        archive.byteOffset + archive.byteLength,
      ) as ArrayBuffer,
    );
  }

  return fakeFetch(input);
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const createTestLaunchPlan = (
  directories: LauncherDirectories,
  overrides: Partial<LaunchPlan> = {},
): LaunchPlan => {
  const root = join(directories.instances, "instance_test");
  const app = join(root, ".nyxen");
  const game = join(root, ".minecraft");
  const folders = {
    app,
    cache: join(app, "cache"),
    config: join(game, "config"),
    game,
    logs: join(game, "logs"),
    media: join(app, "media"),
    metadata: join(app, "metadata"),
    mods: join(game, "mods"),
    resourcePacks: join(game, "resourcepacks"),
    root,
    saves: join(game, "saves"),
    screenshots: join(game, "screenshots"),
    shaderPacks: join(game, "shaderpacks"),
  };

  return {
    arguments: {
      game: [],
      jvm: [],
    },
    classpath: [],
    createdAt: "2024-01-04T00:00:00.000Z",
    directories: {
      ...directories,
      game,
      instance: root,
      instanceCache: folders.cache,
      instanceConfig: folders.config,
      instanceLogs: folders.logs,
      instanceMetadata: folders.metadata,
      mods: folders.mods,
      natives: join(directories.temp, "natives", "instance_test", "1.20.4"),
      resourcePacks: folders.resourcePacks,
      saves: folders.saves,
      screenshots: folders.screenshots,
      shaderPacks: folders.shaderPacks,
    },
    instance: {
      bannerUrl: null,
      createdAt: "2024-01-04T00:00:00.000Z",
      folders,
      gameArgs: [],
      gameDirectory: game,
      iconUrl: null,
      id: "instance_test",
      instanceDirectory: root,
      javaArgs: [],
      javaExecutable: null,
      lastLaunchedAt: null,
      loader: "vanilla",
      loaderVersion: null,
      metadataPath: join(folders.metadata, "instance.json"),
      memoryMaxMb: 4096,
      memoryMinMb: 512,
      modpack: null,
      name: "Test Instance",
      profileId: null,
      updatedAt: "2024-01-04T00:00:00.000Z",
      versionId: "1.20.4",
    },
    java: {
      component: "java-runtime-gamma",
      detectedMajorVersion: null,
      detectedVersion: null,
      detectionError: null,
      executable: "java",
      management: "auto",
      majorVersion: 17,
      memoryMaxMb: 4096,
      memoryMinMb: 512,
      runtimeDirectory: null,
      runtimePlatform: null,
      runtimeVersion: null,
    },
    legacyArgFormat: false,
    minecraft: {
      assetIndexId: null,
      baseVersionId: "1.20.4",
      mainClass: "net.minecraft.client.main.Main",
      versionId: "1.20.4",
    },
    missingArtifacts: [],
    modLoader: {
      installerPath: null,
      installerUrl: null,
      kind: "vanilla",
      minecraftVersionId: "1.20.4",
      version: null,
    },
    nativeArtifactPaths: [],
    profile: null,
    warnings: [],
    ...overrides,
  };
};

describe("launcher backend", () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "nyxen-launcher-"));

  beforeAll(() => {
    process.env.NYXEN_DATA_DIR = dataRoot;
    process.env.NYXEN_MICROSOFT_CLIENT_ID = "test-client-id";
  });

  afterAll(async () => {
    const { sqlite } = await import("../src/bun/db/client");

    sqlite.close();
    delete process.env.NYXEN_DATA_DIR;
    delete process.env.NYXEN_MICROSOFT_CLIENT_ID;
    rmSync(dataRoot, { force: true, recursive: true });
  });

  test("persists version metadata, profiles, instances, and launch plans", async () => {
    const { createLauncherInstance, listLauncherInstances } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { listLauncherProfiles } = await import(
      "../src/bun/launcher/profiles"
    );
    const { completeMicrosoftProfileLogin, startMicrosoftProfileLogin } =
      await import("../src/bun/launcher/microsoft-auth");
    const { getLauncherStatus } = await import("../src/bun/launcher/status");
    const {
      getMinecraftVersionDetails,
      listMinecraftVersions,
      refreshMinecraftVersionManifest,
    } = await import("../src/bun/launcher/versions");

    const manifest = await refreshMinecraftVersionManifest({
      fetcher: fakeFetch,
      manifestUrl:
        "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
      now: () => new Date("2024-01-04T00:00:00.000Z"),
    });

    expect(manifest.latest.release).toBe("1.20.4");
    expect(listMinecraftVersions({ includeSnapshots: false })).toHaveLength(1);

    const login = await startMicrosoftProfileLogin({
      fetcher: fakeFetch,
      now: () => new Date("2099-01-04T00:00:00.000Z"),
    });
    let loginResult = await completeMicrosoftProfileLogin(
      {
        deviceCode: login.deviceCode,
      },
      {
        fetcher: fakeFetch,
        now: () => new Date("2099-01-04T00:00:00.000Z"),
      },
    );

    for (
      let attempt = 0;
      loginResult.status === "pending" && attempt < 10;
      attempt += 1
    ) {
      await wait(0);
      loginResult = await completeMicrosoftProfileLogin(
        {
          deviceCode: login.deviceCode,
        },
        {
          fetcher: fakeFetch,
          now: () => new Date("2099-01-04T00:00:00.000Z"),
        },
      );
    }

    expect(loginResult.status).toBe("complete");

    if (loginResult.status !== "complete") {
      throw new Error("Expected Microsoft login to complete.");
    }

    const profile = loginResult.profile;
    const instance = createLauncherInstance({
      javaArgs: ["-XX:+UseG1GC"],
      memoryMaxMb: 8192,
      name: "Survival",
      profileId: profile.id,
      versionId: "1.20.4",
    });
    const details = await getMinecraftVersionDetails(
      {
        versionId: "1.20.4",
      },
      {
        fetcher: fakeFetch,
      },
    );
    const plan = await createLaunchPlan(
      {
        instanceId: instance.id,
      },
      {
        fetcher: fakeFetch,
      },
    );
    const status = getLauncherStatus();

    expect(details.mainClass).toBe("net.minecraft.client.main.Main");
    expect(profile.accountId).toBe(minecraftProfileDocument.id);
    expect(profile.displayName).toBe(minecraftProfileDocument.name);
    expect(profile.entitlements).toEqual([
      "game_minecraft",
      "product_minecraft",
    ]);
    expect(profile.kind).toBe("microsoft");
    expect(profile.ownershipCheckedAt).toBe("2099-01-04T00:00:00.000Z");
    expect(profile.skinUrl).toBe("https://textures.minecraft.net/texture/test");
    expect(listLauncherProfiles()).toHaveLength(1);
    expect(listLauncherInstances()).toHaveLength(1);
    expect(plan.profile?.id).toBe(profile.id);
    expect(plan.java.memoryMaxMb).toBe(8192);
    expect(plan.arguments.game).toContain("--username");
    expect(plan.missingArtifacts.map((artifact) => artifact.kind)).toEqual([
      "clientJar",
      "assetIndex",
      "library",
    ]);
    expect(status.counts).toEqual({
      instances: 1,
      profiles: 1,
      versions: 2,
    });
  }, 15_000);

  test("adds missing asset objects from cached asset indexes", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const directories = getLauncherDirectories();
    const assetIndexPath = join(directories.assets, "indexes", "12.json");

    mkdirSync(dirname(assetIndexPath), { recursive: true });
    writeFileSync(assetIndexPath, JSON.stringify(assetIndexDocument));

    try {
      const instance = createLauncherInstance({
        name: "Asset Check",
        versionId: "1.20.4",
      });
      const plan = await createLaunchPlan(
        { instanceId: instance.id },
        { fetcher: fakeFetch },
      );
      const assetObject = plan.missingArtifacts.find(
        (artifact) => artifact.kind === "assetObject",
      );

      expect(assetObject).toMatchObject({
        id: `asset:${assetObjectHash}`,
        path: join(
          directories.assets,
          "objects",
          assetObjectHash.slice(0, 2),
          assetObjectHash,
        ),
        sha1: assetObjectHash,
        url: `https://resources.download.minecraft.net/${assetObjectHash.slice(
          0,
          2,
        )}/${assetObjectHash}`,
      });
    } finally {
      rmSync(assetIndexPath, { force: true });
    }
  });

  test("rejects Microsoft profiles when the account does not own Minecraft", async () => {
    const { completeMicrosoftProfileLogin } = await import(
      "../src/bun/launcher/microsoft-auth"
    );

    const pending = await completeMicrosoftProfileLogin(
      {
        deviceCode: "no-ownership-device-code",
      },
      {
        fetcher: createFakeFetch([]),
        now: () => new Date("2024-01-04T00:00:00.000Z"),
      },
    );
    expect(pending.status).toBe("pending");

    let rejection: unknown = null;

    for (let attempt = 0; !rejection && attempt < 10; attempt += 1) {
      await wait(0);

      try {
        await completeMicrosoftProfileLogin(
          {
            deviceCode: "no-ownership-device-code",
          },
          {
            fetcher: createFakeFetch([]),
            now: () => new Date("2024-01-04T00:00:00.000Z"),
          },
        );
      } catch (error) {
        rejection = error;
      }
    }

    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toContain("does not own Minecraft");
  });

  test("updates and deletes launcher instance settings", async () => {
    const {
      createLauncherInstance,
      deleteLauncherInstance,
      getLauncherInstance,
      updateLauncherInstance,
    } = await import("../src/bun/launcher/instances");
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      memoryMaxMb: 2048,
      name: "Editable Instance",
      versionId: "1.20.4",
    });
    const updated = updateLauncherInstance({
      gameArgs: ["--width", "1280"],
      instanceId: instance.id,
      javaArgs: ["-XX:+UseG1GC"],
      loader: "fabric",
      loaderVersion: "0.15.7",
      memoryMaxMb: 6144,
      memoryMinMb: 1024,
      name: "Edited Instance",
      versionId: "1.20.4",
    });
    const metadata = JSON.parse(readFileSync(updated.metadataPath, "utf8"));

    expect(updated.name).toBe("Edited Instance");
    expect(updated.loader).toBe("fabric");
    expect(updated.loaderVersion).toBe("0.15.7");
    expect(updated.memoryMinMb).toBe(1024);
    expect(updated.memoryMaxMb).toBe(6144);
    expect(updated.javaArgs).toEqual(["-XX:+UseG1GC"]);
    expect(updated.gameArgs).toEqual(["--width", "1280"]);
    expect(metadata.name).toBe("Edited Instance");
    expect(metadata.loader).toBe("fabric");

    const result = deleteLauncherInstance({
      deleteFiles: true,
      instanceId: instance.id,
    });

    expect(result).toEqual({
      deleted: true,
      deletedFiles: true,
      instanceId: instance.id,
    });
    expect(getLauncherInstance(instance.id)).toBeNull();
    expect(existsSync(instance.instanceDirectory)).toBe(false);
  });

  test("reports database records across launcher tables", async () => {
    const { getDatabaseStatus } = await import("../src/bun/db/client");
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLauncherProfile } = await import(
      "../src/bun/launcher/profiles"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const before = getDatabaseStatus();
    const profile = createLauncherProfile({
      displayName: "DbCountUser",
      kind: "offline",
    });

    createLauncherInstance({
      name: "Db Count Instance",
      profileId: profile.id,
      versionId: "1.20.4",
    });

    expect(getDatabaseStatus().records).toBeGreaterThanOrEqual(
      before.records + 2,
    );
  });

  test("guards runtime changes when local mods are installed", async () => {
    const { createLauncherInstance, updateLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "Guarded Mods",
      versionId: "1.20.4",
    });

    mkdirSync(instance.folders.mods, { recursive: true });
    writeFileSync(join(instance.folders.mods, "example-mod.jar"), "");

    expect(() =>
      updateLauncherInstance({
        instanceId: instance.id,
        loader: "fabric",
        loaderVersion: "0.15.7",
        versionId: "1.20.4",
      }),
    ).toThrow("Confirm mod compatibility");

    const updated = updateLauncherInstance({
      confirmRuntimeCompatibility: true,
      instanceId: instance.id,
      loader: "fabric",
      loaderVersion: "0.15.7",
      versionId: "1.20.4",
    });

    expect(updated.loader).toBe("fabric");
    expect(updated.loaderVersion).toBe("0.15.7");
  });

  test("returns pending while Minecraft ownership checks run in the background", async () => {
    const { completeMicrosoftProfileLogin } = await import(
      "../src/bun/launcher/microsoft-auth"
    );

    const result = await completeMicrosoftProfileLogin(
      {
        deviceCode: "background-device-code",
      },
      {
        fetcher: fakeHangingOwnershipFetch,
        now: () => new Date("2024-01-04T00:00:00.000Z"),
        requestTimeoutMs: 100,
      },
    );

    expect(result).toEqual({
      message: "Microsoft sign-in finished. Checking Minecraft ownership.",
      retryAfterSeconds: 2,
      status: "pending",
    });

    const stillPending = await completeMicrosoftProfileLogin(
      {
        deviceCode: "background-device-code",
      },
      {
        fetcher: fakeHangingOwnershipFetch,
        now: () => new Date("2024-01-04T00:00:00.000Z"),
        requestTimeoutMs: 100,
      },
    );

    expect(stillPending.status).toBe("pending");
  });

  test("polls Microsoft sign-in before Minecraft ownership verification", async () => {
    const { completeMicrosoftProfileLogin, pollMicrosoftProfileSignIn } =
      await import("../src/bun/launcher/microsoft-auth");

    const signIn = await pollMicrosoftProfileSignIn(
      {
        deviceCode: "signed-in-device-code",
      },
      {
        fetcher: fakeFetch,
      },
    );

    expect(signIn).toEqual({
      message: "Signed in to Microsoft. Verify Minecraft ownership to finish.",
      status: "signedIn",
    });

    const verify = await completeMicrosoftProfileLogin(
      {
        deviceCode: "signed-in-device-code",
      },
      {
        fetcher: fakeHangingOwnershipFetch,
        requestTimeoutMs: 100,
      },
    );

    expect(verify.status).toBe("pending");
  });

  test("explains Minecraft invalid app registration failures", async () => {
    const { completeMicrosoftProfileLogin } = await import(
      "../src/bun/launcher/microsoft-auth"
    );

    const pending = await completeMicrosoftProfileLogin(
      {
        deviceCode: "invalid-app-registration-device-code",
      },
      {
        fetcher: fakeInvalidMinecraftAppRegistrationFetch,
      },
    );

    expect(pending.status).toBe("pending");

    let rejection: unknown = null;

    for (let attempt = 0; !rejection && attempt < 10; attempt += 1) {
      await wait(0);

      try {
        await completeMicrosoftProfileLogin(
          {
            deviceCode: "invalid-app-registration-device-code",
          },
          {
            fetcher: fakeInvalidMinecraftAppRegistrationFetch,
          },
        );
      } catch (error) {
        rejection = error;
      }
    }

    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toContain(
      "Minecraft Services must approve this Azure application id",
    );
    expect((rejection as Error).message).toContain("https://aka.ms/AppRegInfo");
  });

  test("explains how to fix device-code apps that are not public clients", async () => {
    const { startMicrosoftProfileLogin } = await import(
      "../src/bun/launcher/microsoft-auth"
    );

    await expect(
      startMicrosoftProfileLogin({
        fetcher: fakeUnsupportedDeviceCodeFetch,
      }),
    ).rejects.toThrow("enable public client/native mobile and desktop flows");
  });

  test("fails Microsoft auth network hangs before the RPC request times out", async () => {
    const { startMicrosoftProfileLogin } = await import(
      "../src/bun/launcher/microsoft-auth"
    );

    await expect(
      startMicrosoftProfileLogin({
        fetcher: fakeHangingFetch,
        requestTimeoutMs: 5,
      }),
    ).rejects.toThrow("Microsoft device login timed out");
  });

  test("rejects unsafe Minecraft version ids from metadata", async () => {
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );
    const unsafeVersion = manifestDocument.versions[0];

    if (!unsafeVersion) {
      throw new Error("Expected test manifest to include a version.");
    }

    await expect(
      refreshMinecraftVersionManifest({
        fetcher: async () =>
          jsonResponse({
            ...manifestDocument,
            versions: [
              {
                ...unsafeVersion,
                id: "../escape",
              },
            ],
          }),
      }),
    ).rejects.toThrow("Version id cannot contain path separators");
  });

  test("refetches corrupt cached Minecraft version details", async () => {
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    const cached = await getMinecraftVersionDetails(
      { refresh: true, versionId: "1.20.4" },
      { fetcher: fakeFetch },
    );
    let detailRequests = 0;

    writeFileSync(cached.path, "{not-json");

    const refreshed = await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      {
        fetcher: async (input) => {
          const url = input instanceof Request ? input.url : input.toString();

          if (url === "https://metadata.test/versions/1.20.4.json") {
            detailRequests += 1;
          }

          return fakeFetch(input);
        },
      },
    );

    expect(refreshed.id).toBe("1.20.4");
    expect(detailRequests).toBe(1);
    expect(JSON.parse(readFileSync(cached.path, "utf8")).id).toBe("1.20.4");
  });

  test("rejects mismatched Minecraft version detail metadata", async () => {
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    await expect(
      getMinecraftVersionDetails(
        { refresh: true, versionId: "1.20.4" },
        {
          fetcher: async () =>
            jsonResponse({
              ...versionDetailsDocument,
              id: "1.20.5",
            }),
        },
      ),
    ).rejects.toThrow("Minecraft version metadata id does not match request");
  });

  test("rejects launcher instances with non-Java executables", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      { fetcher: fakeFetch },
    );

    expect(() =>
      createLauncherInstance({
        javaExecutable: "/bin/sh",
        name: "Unsafe Java",
        versionId: "1.20.4",
      }),
    ).toThrow("Java executable must point to java or javaw");
  });

  test("explains required Java when an instance pins user-managed Java", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { completeMicrosoftProfileLogin, startMicrosoftProfileLogin } =
      await import("../src/bun/launcher/microsoft-auth");
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      { fetcher: fakeFetch },
    );
    const login = await startMicrosoftProfileLogin({ fetcher: fakeFetch });
    let loginResult = await completeMicrosoftProfileLogin(
      { deviceCode: login.deviceCode },
      { fetcher: fakeFetch },
    );

    for (
      let attempt = 0;
      loginResult.status === "pending" && attempt < 10;
      attempt += 1
    ) {
      await wait(0);
      loginResult = await completeMicrosoftProfileLogin(
        { deviceCode: login.deviceCode },
        { fetcher: fakeFetch },
      );
    }

    if (loginResult.status !== "complete") {
      throw new Error("Expected Microsoft login to complete.");
    }

    const instance = createLauncherInstance({
      javaExecutable: "/usr/bin/java",
      name: "Pinned Java",
      profileId: loginResult.profile.id,
      versionId: "1.20.4",
    });
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      {
        fetcher: fakeFetch,
        javaVersionProbeRunner: () => ({
          error: null,
          status: 0,
          stderr: 'openjdk version "1.8.0_392"',
          stdout: "",
        }),
      },
    );

    expect(plan.java.management).toBe("auto");
    expect(plan.java.executable).toBe("/usr/bin/java");
    expect(plan.java.detectedMajorVersion).toBe(8);
    expect(plan.java.detectedVersion).toBe("1.8.0_392");
    expect(plan.warnings).toContain(
      "Instance Java executable is user-managed; detected Java 8, but 1.20.4 requires Java 17.",
    );

    const missingJavaInstance = createLauncherInstance({
      javaExecutable: "/opt/missing/bin/java",
      name: "Missing Java",
      profileId: loginResult.profile.id,
      versionId: "1.20.4",
    });
    const missingJavaPlan = await createLaunchPlan(
      { instanceId: missingJavaInstance.id },
      {
        fetcher: fakeFetch,
        javaVersionProbeRunner: () => ({
          error: { message: "ENOENT" },
          status: null,
          stderr: "",
          stdout: "",
        }),
      },
    );

    expect(missingJavaPlan.java.detectedMajorVersion).toBeNull();
    expect(missingJavaPlan.java.detectedVersion).toBeNull();
    expect(missingJavaPlan.java.detectionError).toBe("ENOENT");
    expect(missingJavaPlan.warnings).toContain(
      "Instance Java executable is user-managed; 1.20.4 requires Java 17, but Java version could not be detected: ENOENT",
    );
  });

  test("creates isolated Prism-style folders for each instance", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "Folder Layout",
      versionId: "1.20.4",
    });
    const directories = getLauncherDirectories();
    const expectedRoot = join(directories.instances, instance.id);
    const expectedGame = join(expectedRoot, ".minecraft");
    const expectedApp = join(expectedRoot, ".nyxen");
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      { fetcher: fakeFetch },
    );
    const metadata = JSON.parse(readFileSync(instance.metadataPath, "utf8"));

    expect(instance.instanceDirectory).toBe(expectedRoot);
    expect(instance.gameDirectory).toBe(expectedGame);
    expect(instance.metadataPath).toBe(
      join(expectedApp, "metadata", "instance.json"),
    );
    expect(instance.folders.app).toBe(expectedApp);
    expect(instance.folders.cache).toBe(join(expectedApp, "cache"));
    expect(instance.folders.metadata).toBe(join(expectedApp, "metadata"));
    expect(instance.folders.mods).toBe(join(expectedGame, "mods"));
    expect(instance.folders.resourcePacks).toBe(
      join(expectedGame, "resourcepacks"),
    );
    expect(plan.directories.instance).toBe(expectedRoot);
    expect(plan.directories.instanceCache).toBe(join(expectedApp, "cache"));
    expect(plan.directories.instanceMetadata).toBe(
      join(expectedApp, "metadata"),
    );
    expect(plan.directories.game).toBe(expectedGame);
    expect(plan.directories.mods).toBe(join(expectedGame, "mods"));
    expect(plan.directories.saves).toBe(join(expectedGame, "saves"));
    expect(metadata).toMatchObject({
      app: {
        name: "nyxen",
        schemaVersion: 1,
      },
      gameDirectory: expectedGame,
      instanceDirectory: expectedRoot,
      instanceId: instance.id,
      loader: "vanilla",
      name: "Folder Layout",
      versionId: "1.20.4",
    });

    for (const directory of Object.values(instance.folders)) {
      expect(existsSync(directory)).toBe(true);
    }
  });

  test("marks launcher instances as launched", async () => {
    const {
      createLauncherInstance,
      getLauncherInstance,
      markLauncherInstanceLaunched,
    } = await import("../src/bun/launcher/instances");
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );
    const launchedAt = "2024-01-05T12:34:56.000Z";

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "Launch Timestamp",
      versionId: "1.20.4",
    });

    markLauncherInstanceLaunched(instance.id, launchedAt);

    expect(getLauncherInstance(instance.id)).toMatchObject({
      lastLaunchedAt: launchedAt,
      updatedAt: launchedAt,
    });
  });

  test("inventories instance content and toggles local mod files", async () => {
    const { getInstanceContent, getInstanceLogFile, setInstanceModEnabled } =
      await import("../src/bun/launcher/instance-content");
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "Content Inventory",
      versionId: "1.20.4",
    });

    writeFileSync(join(instance.folders.mods, "enabled-mod.jar"), "enabled");
    writeFileSync(
      join(instance.folders.mods, "disabled-mod.jar.disabled"),
      "disabled",
    );
    writeFileSync(join(instance.folders.mods, "notes.txt"), "ignored");
    writeFileSync(
      join(instance.folders.resourcePacks, "resource-pack.zip"),
      "",
    );
    writeFileSync(join(instance.folders.shaderPacks, "shader-pack.zip"), "");
    mkdirSync(join(instance.folders.saves, "Survival World"));
    writeFileSync(join(instance.folders.screenshots, "screen.png"), "");
    writeFileSync(
      join(instance.folders.logs, "latest.log"),
      [
        "[12:00:00] [Render thread/INFO]: Started Minecraft",
        "",
        "[12:00:01] [Render thread/WARN]: Missing optional resource",
        "[12:00:02] [Render thread/ERROR] [mixin/]: Mixin apply failed for BrokenMod",
        "java.lang.RuntimeException: Broken mixin target",
        "\tat com.example.BrokenMod.fail(BrokenMod.java:42)",
        "[12:00:03] [Render thread/ERROR] [net.minecraft.client.renderer.RenderSystem/]: Failed to load shader",
        "Caused by: java.io.FileNotFoundException: missing_shader.json",
      ].join("\n"),
    );
    writeFileSync(
      join(instance.folders.logs, "2026-05-10-1.log.gz"),
      gzipSync("[12:00:03] [main/INFO]: Archived session\n"),
    );
    mkdirSync(join(instance.gameDirectory, "crash-reports"));
    writeFileSync(
      join(
        instance.gameDirectory,
        "crash-reports",
        "crash-2026-05-10_12.30.00-client.txt",
      ),
      "---- Minecraft Crash Report ----",
    );
    writeFileSync(join(instance.gameDirectory, "servers.dat"), "servers");

    const content = getInstanceContent({ instanceId: instance.id });

    expect(content.instanceId).toBe(instance.id);
    expect(content.counts).toMatchObject({
      disabledMods: 1,
      enabledMods: 1,
      logs: 3,
      mods: 2,
      resourcePacks: 1,
      screenshots: 1,
      shaderPacks: 1,
      worlds: 1,
    });
    expect(content.mods.map((mod) => [mod.fileName, mod.enabled])).toEqual([
      ["disabled-mod.jar.disabled", false],
      ["enabled-mod.jar", true],
    ]);
    expect(content.resourcePacks[0]?.fileName).toBe("resource-pack.zip");
    expect(content.shaderPacks[0]?.fileName).toBe("shader-pack.zip");
    expect(content.screenshots[0]?.fileName).toBe("screen.png");
    expect(content.logs.map((log) => log.fileName).sort()).toEqual([
      "2026-05-10-1.log.gz",
      "crash-2026-05-10_12.30.00-client.txt",
      "latest.log",
    ]);
    expect(content.logFolders.map((folder) => folder.id).sort()).toEqual([
      "crash-reports",
      "logs",
    ]);
    expect(
      content.logFolders
        .flatMap((folder) => folder.files)
        .map((log) => [log.fileName, log.displayName]),
    ).toEqual(
      expect.arrayContaining([
        ["latest.log", "Live Session"],
        ["2026-05-10-1.log.gz", "May 10, 2026 Run 1"],
        [
          "crash-2026-05-10_12.30.00-client.txt",
          "Client Crash May 10, 2026 12:30:00",
        ],
      ]),
    );
    expect(content.worlds[0]?.fileName).toBe("Survival World");
    expect(content.serverList?.fileName).toBe("servers.dat");

    const latestLog = content.logs.find((log) => log.fileName === "latest.log");
    expect(latestLog).toBeDefined();

    const preview = getInstanceLogFile({
      fileId: latestLog?.id ?? "",
      instanceId: instance.id,
    });

    expect(preview.summary).toMatchObject({
      errors: 2,
      totalLines: 4,
      warnings: 1,
    });
    expect(
      preview.lines.map((line) => [
        line.level,
        line.type,
        line.source,
        line.groupLabel,
        line.message,
        line.details,
      ]),
    ).toEqual([
      ["info", "game", null, null, "Started Minecraft", []],
      ["warn", "resource", null, "Resource", "Missing optional resource", []],
      [
        "error",
        "mixin",
        "mixin",
        "Mixin",
        "Mixin apply failed for BrokenMod",
        [
          "java.lang.RuntimeException: Broken mixin target",
          "\tat com.example.BrokenMod.fail(BrokenMod.java:42)",
        ],
      ],
      [
        "error",
        "graphics",
        "net.minecraft.client.renderer.RenderSystem",
        "Graphics",
        "Failed to load shader",
        ["Caused by: java.io.FileNotFoundException: missing_shader.json"],
      ],
    ]);

    const afterDisable = setInstanceModEnabled({
      enabled: false,
      fileName: "enabled-mod.jar",
      instanceId: instance.id,
    });

    expect(existsSync(join(instance.folders.mods, "enabled-mod.jar"))).toBe(
      false,
    );
    expect(
      existsSync(join(instance.folders.mods, "enabled-mod.jar.disabled")),
    ).toBe(true);
    expect(afterDisable.counts).toMatchObject({
      disabledMods: 2,
      enabledMods: 0,
    });

    const afterEnable = setInstanceModEnabled({
      enabled: true,
      fileName: "enabled-mod.jar.disabled",
      instanceId: instance.id,
    });

    expect(existsSync(join(instance.folders.mods, "enabled-mod.jar"))).toBe(
      true,
    );
    expect(afterEnable.counts).toMatchObject({
      disabledMods: 1,
      enabledMods: 1,
    });
    expect(() =>
      setInstanceModEnabled({
        enabled: false,
        fileName: "../enabled-mod.jar",
        instanceId: instance.id,
      }),
    ).toThrow("File name is invalid.");
    expect(() =>
      setInstanceModEnabled({
        enabled: false,
        fileName: "..\\enabled-mod.jar",
        instanceId: instance.id,
      }),
    ).toThrow("File name is invalid.");
  });

  test("downloads CurseForge files into instance folders and metadata", async () => {
    const { downloadCurseForgeFile } = await import(
      "../src/bun/launcher/instance-content"
    );
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "CurseForge Direct Install",
      versionId: "1.20.4",
    });
    const requests: Array<string> = [];

    const result = await downloadCurseForgeFile(
      {
        category: "mods",
        file: {
          displayName: "Example Mod 1.0",
          downloadUrl: "https://downloads.example.test/example-mod.jar",
          fileDate: "2024-02-01T00:00:00Z",
          fileName: "example-mod.jar",
          gameVersions: ["1.20.4"],
          id: 456,
          modLoaders: ["fabric"],
          releaseType: "release",
        },
        instanceId: instance.id,
        projectId: 123,
        projectName: "Example Mod",
        projectSlug: "example-mod",
      },
      {
        fetcher: async (input) => {
          requests.push(input.toString());
          return new Response("mod-data", {
            headers: { "content-length": "8" },
          });
        },
      },
    );

    expect(requests).toEqual([
      "https://downloads.example.test/example-mod.jar",
    ]);
    expect(result.fileName).toBe("example-mod.jar");
    expect(
      readFileSync(join(instance.folders.mods, "example-mod.jar"), "utf8"),
    ).toBe("mod-data");
    expect(result.content?.counts.mods).toBe(1);
    expect(result.content?.curseForge.mods?.[0]).toMatchObject({
      category: "mods",
      fileId: "456",
      fileName: "example-mod.jar",
      name: "Example Mod",
      projectId: "123",
      slug: "example-mod",
    });
  });

  test("installs and updates CurseForge modpacks as locked instances", async () => {
    const {
      downloadCurseForgeFile,
      getInstanceContent,
      getMissingRequiredModpackDependencies,
      getInstanceModpackUpdate,
      setInstanceModEnabled,
      updateInstanceModpack,
    } = await import("../src/bun/launcher/instance-content");
    const { listLauncherInstances } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const createPackArchive = (fileId: number, optionValue: string) =>
      createStoredZip({
        "manifest.json": JSON.stringify({
          files: [
            {
              fileID: fileId,
              projectID: 222,
              required: true,
            },
            {
              fileID: 335,
              projectID: 223,
              required: true,
            },
            {
              fileID: 336,
              projectID: 224,
              required: true,
            },
          ],
          manifestType: "minecraftModpack",
          manifestVersion: 1,
          minecraft: {
            modLoaders: [{ id: "fabric-0.15.7", primary: true }],
            recommendedRam: 6144,
            version: "1.20.4",
          },
          name: "Fabulously Optimized",
          overrides: "overrides",
          version: optionValue,
        }),
        "overrides/options.txt": optionValue,
      });
    const packV1Archive = createPackArchive(333, "pack-version-1");
    const packV2Archive = createPackArchive(334, "pack-version-2");
    const resourcePackArchive = createStoredZip({
      "assets/minecraft/textures/gui/title/background/panorama_0.png":
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      "pack.mcmeta": JSON.stringify({
        pack: {
          description: "Texture images used by the modpack",
          pack_format: 15,
        },
      }),
    });
    let mediaAvailable = true;
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === "https://downloads.example.test/pack-1.zip") {
        return new Response(Buffer.from(packV1Archive), {
          headers: { "content-length": String(packV1Archive.byteLength) },
        });
      }

      if (url === "https://downloads.example.test/pack-2.zip") {
        return new Response(Buffer.from(packV2Archive), {
          headers: { "content-length": String(packV2Archive.byteLength) },
        });
      }

      if (url === "https://curseforge.test/v1/mods/111") {
        return jsonResponse({
          data: {
            classId: 4471,
            downloadCount: 10,
            id: 111,
            latestFiles: [
              {
                displayName: "Fabulously Optimized 2.0",
                downloadUrl: "https://downloads.example.test/pack-2.zip",
                fileDate: "2024-03-01T00:00:00Z",
                fileName: "fabulously-2.zip",
                gameVersions: ["1.20.4", "Fabric"],
                id: 445,
                releaseType: 1,
              },
            ],
            latestFilesIndexes: [
              {
                fileId: 445,
                gameVersion: "1.20.4",
                modLoader: 4,
              },
            ],
            links: {
              websiteUrl:
                "https://www.curseforge.com/minecraft/modpacks/fabulously-optimized",
            },
            logo: { url: "https://media.example.test/icon.png" },
            name: "Fabulously Optimized",
            screenshots: [{ url: "https://media.example.test/banner.png" }],
            slug: "fabulously-optimized",
            summary: "Performance pack",
          },
        });
      }

      if (url === "https://curseforge.test/v1/mods/222/files/333") {
        return jsonResponse({
          data: {
            displayName: "Dependency 1.0",
            downloadUrl: "https://downloads.example.test/dependency.jar",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "dependency.jar",
            gameVersions: ["1.20.4", "Fabric"],
            id: 333,
            releaseType: 1,
          },
        });
      }

      if (url === "https://curseforge.test/v1/mods/222/files/334") {
        return jsonResponse({
          data: {
            displayName: "Dependency 2.0",
            downloadUrl: "https://downloads.example.test/dependency-2.jar",
            fileDate: "2024-03-01T00:00:00Z",
            fileName: "dependency-2.jar",
            gameVersions: ["1.20.4", "Fabric"],
            id: 334,
            releaseType: 1,
          },
        });
      }

      if (url === "https://curseforge.test/v1/mods/223") {
        return jsonResponse({
          data: {
            classId: 12,
            downloadCount: 5,
            id: 223,
            latestFiles: [],
            name: "Modpack Menu Images",
            slug: "modpack-menu-images",
            summary: "Resource pack images",
          },
        });
      }

      if (url === "https://curseforge.test/v1/mods/223/files/335") {
        return jsonResponse({
          data: {
            displayName: "Menu Images 1.0",
            downloadUrl: "https://downloads.example.test/resource-pack.zip",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "resource-pack.zip",
            gameVersions: ["1.20.4"],
            id: 335,
            releaseType: 1,
          },
        });
      }

      if (url === "https://curseforge.test/v1/mods/224/files/336") {
        return jsonResponse({
          data: {
            displayName: "Fallback Dependency 1.0",
            downloadUrl: null,
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "fallback-dependency.jar",
            gameVersions: ["1.20.4", "Fabric"],
            id: 336,
            releaseType: 1,
          },
        });
      }

      if (url === "https://downloads.example.test/dependency.jar") {
        return new Response("dependency-v1");
      }

      if (url === "https://downloads.example.test/dependency-2.jar") {
        return new Response("dependency-v2");
      }

      if (url === "https://downloads.example.test/resource-pack.zip") {
        return new Response(Buffer.from(resourcePackArchive), {
          headers: { "content-length": String(resourcePackArchive.byteLength) },
        });
      }

      if (
        url.startsWith(
          "https://www.curseforge.com/api/v1/mods/224/files/336/download",
        )
      ) {
        return new Response("fallback-dependency");
      }

      if (
        url === "https://media.example.test/icon.png" ||
        url === "https://media.example.test/banner.png"
      ) {
        if (!mediaAvailable) {
          return new Response("missing", { status: 404 });
        }

        return new Response("image-data", {
          headers: { "content-type": "image/png" },
        });
      }

      if (url === "https://downloads.example.test/rogue.jar") {
        return new Response("rogue");
      }

      return new Response("not found", { status: 404 });
    };

    const result = await downloadCurseForgeFile(
      {
        category: "modpacks",
        file: {
          displayName: "Fabulously Optimized 1.0",
          downloadUrl: "https://downloads.example.test/pack-1.zip",
          fileDate: "2024-02-01T00:00:00Z",
          fileName: "fabulously.zip",
          gameVersions: ["1.20.4", "Fabric"],
          id: 444,
          modLoaders: ["fabric"],
          releaseType: "release",
        },
        projectId: 111,
        projectLogoUrl: "https://media.example.test/icon.png",
        projectName: "Fabulously Optimized",
        projectScreenshotUrls: ["https://media.example.test/banner.png"],
        projectSlug: "fabulously-optimized",
        projectWebsiteUrl:
          "https://www.curseforge.com/minecraft/modpacks/fabulously-optimized",
      },
      {
        apiKey: "test-curseforge-key",
        baseUrl: "https://curseforge.test",
        fetcher,
      },
    );
    const instance = result.instance;

    expect(instance).not.toBeNull();
    if (!instance)
      throw new Error("Expected modpack install to create instance");

    expect(
      listLauncherInstances().some((item) => item.id === instance.id),
    ).toBe(true);
    expect(instance).toMatchObject({
      loader: "fabric",
      loaderVersion: "0.15.7",
      memoryMaxMb: 6144,
      name: "Fabulously Optimized",
      versionId: "1.20.4",
    });
    expect(instance.iconUrl?.startsWith("file:")).toBe(true);
    expect(instance.bannerUrl?.startsWith("file:")).toBe(true);
    expect(instance.modpack).toMatchObject({
      fileId: "444",
      installedFiles: 3,
      locked: true,
      projectId: "111",
      skippedFiles: 0,
    });
    expect(
      existsSync(join(instance.folders.media, "curseforge-icon.png")),
    ).toBe(true);
    expect(
      existsSync(join(instance.folders.media, "curseforge-banner.png")),
    ).toBe(true);
    expect(
      readFileSync(join(instance.gameDirectory, "options.txt"), "utf8"),
    ).toBe("pack-version-1");
    expect(
      readFileSync(join(instance.folders.mods, "dependency.jar"), "utf8"),
    ).toBe("dependency-v1");
    expect(
      readFileSync(join(instance.folders.resourcePacks, "resource-pack.zip")),
    ).toEqual(Buffer.from(resourcePackArchive));
    expect(
      readFileSync(
        join(instance.folders.mods, "fallback-dependency.jar"),
        "utf8",
      ),
    ).toBe("fallback-dependency");
    const initialRecipe = result.content?.recipe;
    expect(initialRecipe).toMatchObject({
      counts: {
        managedFiles: 3,
        overrides: 1,
        weaklyVerified: 0,
      },
      status: "clean",
    });
    expect(initialRecipe?.revision.source).toMatchObject({
      fileId: "444",
      kind: "curseforge",
      projectId: "111",
    });
    expect(
      initialRecipe?.revision.files.map((file) => file.path).sort(),
    ).toEqual([
      "mods/dependency.jar",
      "mods/fallback-dependency.jar",
      "resourcepacks/resource-pack.zip",
    ]);
    expect(
      initialRecipe?.revision.files.every(
        (file) => file.hashes.sha1 && file.hashes.sha512,
      ),
    ).toBe(true);
    writeFileSync(
      join(instance.folders.mods, "fallback-dependency.jar"),
      "changed",
    );
    rmSync(join(instance.folders.mods, "dependency.jar"), { force: true });
    const driftedRecipe = getInstanceContent({
      instanceId: instance.id,
    }).recipe;
    expect(driftedRecipe?.status).toBe("drifted");
    expect(
      driftedRecipe?.drift.map((item) => `${item.status}:${item.path}`),
    ).toEqual(
      expect.arrayContaining([
        "changed:mods/fallback-dependency.jar",
        "missing:mods/dependency.jar",
      ]),
    );
    expect(getMissingRequiredModpackDependencies(instance)).toEqual([]);
    const metadataPath = join(
      instance.folders.metadata,
      "curseforge-content.json",
    );
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    metadata.mods = metadata.mods.filter(
      (item: { fileId?: string }) => item.fileId !== "333",
    );
    writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    expect(getMissingRequiredModpackDependencies(instance)).toEqual([
      { fileID: 333, projectID: 222 },
    ]);
    const originalIconUrl = instance.iconUrl;
    const originalBannerUrl = instance.bannerUrl;

    expect(() =>
      setInstanceModEnabled({
        enabled: false,
        fileName: "dependency.jar",
        instanceId: instance.id,
      }),
    ).toThrow("managed by its linked modpack");
    await expect(
      downloadCurseForgeFile(
        {
          category: "mods",
          file: {
            displayName: "Rogue Mod",
            downloadUrl: "https://downloads.example.test/rogue.jar",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "rogue.jar",
            gameVersions: ["1.20.4"],
            id: 999,
            modLoaders: ["fabric"],
            releaseType: "release",
          },
          instanceId: instance.id,
          projectId: 999,
          projectName: "Rogue Mod",
        },
        { fetcher },
      ),
    ).rejects.toThrow("managed by its linked modpack");
    expect(existsSync(join(instance.folders.mods, "rogue.jar"))).toBe(false);

    const update = await getInstanceModpackUpdate(
      { instanceId: instance.id },
      {
        apiKey: "test-curseforge-key",
        baseUrl: "https://curseforge.test",
        fetcher,
      },
    );
    expect(update.updateAvailable).toBe(true);

    writeFileSync(join(instance.folders.config, "user.cfg"), "before-update");
    mkdirSync(join(instance.folders.saves, "World"), { recursive: true });
    writeFileSync(
      join(instance.folders.saves, "World", "level.dat"),
      "world-data",
    );
    mediaAvailable = false;
    const updated = await updateInstanceModpack(
      { instanceId: instance.id },
      {
        apiKey: "test-curseforge-key",
        baseUrl: "https://curseforge.test",
        fetcher,
      },
    );

    expect(updated.instance.id).toBe(instance.id);
    expect(updated.instance.modpack?.fileId).toBe("445");
    expect(updated.instance.iconUrl).toBe(originalIconUrl);
    expect(updated.instance.bannerUrl).toBe(originalBannerUrl);
    expect(updated.instance.modpack?.iconUrl).toBe(originalIconUrl);
    expect(updated.instance.modpack?.bannerUrl).toBe(originalBannerUrl);
    expect(updated.update.updateAvailable).toBe(false);
    expect(updated.content.recipe).toMatchObject({
      counts: {
        added: 1,
        managedFiles: 3,
        overrides: 1,
        weaklyVerified: 0,
      },
      status: "drifted",
    });
    expect(
      updated.content.recipe?.drift.map(
        (item) => `${item.status}:${item.path}`,
      ),
    ).toContain("added:config/user.cfg");
    expect(updated.content.recipe?.revision.source).toMatchObject({
      fileId: "445",
      kind: "curseforge",
      projectId: "111",
    });
    expect(updated.content.recipe?.revision.previousRevisionId).toBe(
      initialRecipe?.revision.id,
    );
    const snapshotFolder = join(instance.folders.metadata, "update-snapshots");
    const [snapshotFile] = readdirSync(snapshotFolder).sort();
    if (!snapshotFile) {
      throw new Error("Expected modpack update snapshot to be written.");
    }
    const snapshot = JSON.parse(
      readFileSync(join(snapshotFolder, snapshotFile), "utf8"),
    );
    expect(snapshot).toMatchObject({
      instanceId: instance.id,
      modpack: {
        fileId: "444",
      },
      reason: {
        fromFileId: "444",
        kind: "modpack-update",
        toFileId: "445",
      },
      recipeRevisionId: initialRecipe?.revision.id,
    });
    expect(
      snapshot.files.mods.map((file: { path: string }) => file.path),
    ).toContain("mods/fallback-dependency.jar");
    expect(
      snapshot.files.config.map((file: { path: string }) => file.path),
    ).toContain("config/user.cfg");
    expect(
      snapshot.files.saves.map((file: { path: string }) => file.path),
    ).toContain("saves/World/level.dat");
    expect(
      readFileSync(join(instance.gameDirectory, "options.txt"), "utf8"),
    ).toBe("pack-version-2");
    expect(existsSync(join(instance.folders.mods, "dependency.jar"))).toBe(
      false,
    );
    expect(
      readFileSync(join(instance.folders.mods, "dependency-2.jar"), "utf8"),
    ).toBe("dependency-v2");
    expect(
      readFileSync(join(instance.folders.resourcePacks, "resource-pack.zip")),
    ).toEqual(Buffer.from(resourcePackArchive));
  });

  test("marks skipped CurseForge modpack dependencies as optional recipe files", async () => {
    const { downloadCurseForgeFile } = await import(
      "../src/bun/launcher/instance-content"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const packArchive = createStoredZip({
      "manifest.json": JSON.stringify({
        files: [
          {
            fileID: 333,
            projectID: 222,
            required: true,
          },
          {
            fileID: 335,
            projectID: 223,
            required: true,
          },
        ],
        manifestType: "minecraftModpack",
        manifestVersion: 1,
        minecraft: {
          modLoaders: [{ id: "fabric-0.15.7", primary: true }],
          version: "1.20.4",
        },
        name: "Partial CurseForge Pack",
        overrides: "overrides",
        version: "partial-1",
      }),
      "overrides/options.txt": "partial-pack",
    });
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === "https://downloads.example.test/partial-pack.zip") {
        return new Response(Buffer.from(packArchive), {
          headers: { "content-length": String(packArchive.byteLength) },
        });
      }

      if (url === "https://curseforge.test/v1/mods/222/files/333") {
        return jsonResponse({
          data: {
            displayName: "Installed Dependency",
            downloadUrl: "https://downloads.example.test/installed.jar",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "installed.jar",
            gameVersions: ["1.20.4", "Fabric"],
            id: 333,
            releaseType: 1,
          },
        });
      }

      if (url === "https://curseforge.test/v1/mods/223/files/335") {
        return jsonResponse({
          data: {
            displayName: "Skipped Dependency",
            downloadUrl: "https://downloads.example.test/skipped.jar",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "skipped.jar",
            gameVersions: ["1.20.4", "Fabric"],
            id: 335,
            releaseType: 1,
          },
        });
      }

      if (url === "https://downloads.example.test/installed.jar") {
        return new Response("installed");
      }

      if (url === "https://downloads.example.test/skipped.jar") {
        return new Response("unavailable", { status: 503 });
      }

      return new Response("not found", { status: 404 });
    };

    const result = await downloadCurseForgeFile(
      {
        category: "modpacks",
        file: {
          displayName: "Partial CurseForge Pack 1.0",
          downloadUrl: "https://downloads.example.test/partial-pack.zip",
          fileDate: "2024-02-01T00:00:00Z",
          fileName: "partial-pack.zip",
          gameVersions: ["1.20.4", "Fabric"],
          id: 444,
          modLoaders: ["fabric"],
          releaseType: "release",
        },
        projectId: 111,
        projectName: "Partial CurseForge Pack",
      },
      {
        apiKey: "test-curseforge-key",
        baseUrl: "https://curseforge.test",
        fetcher,
      },
    );
    const recipe = result.content?.recipe;

    expect(result.instance?.modpack).toMatchObject({
      installedFiles: 1,
      skippedFiles: 1,
    });
    expect(recipe).toMatchObject({
      counts: {
        managedFiles: 2,
        optionalMissing: 1,
      },
      status: "incomplete",
    });
    expect(recipe?.revision.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          optional: false,
          path: "mods/installed.jar",
        }),
        expect.objectContaining({
          optional: true,
          path: "mods/skipped.jar",
          providerFileId: "335",
          providerProjectId: "223",
        }),
      ]),
    );
    expect(
      recipe?.drift.map((item) => `${item.status}:${item.path}`),
    ).toContain("optionalMissing:mods/skipped.jar");
  });

  test("queues CurseForge downloads in backend-owned download state", async () => {
    const { clearFinishedDownloadJobs, enqueueDownloadJob, listDownloadJobs } =
      await import("../src/bun/launcher/download-queue");
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "Queued CurseForge Install",
      versionId: "1.20.4",
    });
    const originalFetch = globalThis.fetch;
    const requests: Array<string> = [];

    globalThis.fetch = (async (input) => {
      requests.push(input.toString());
      return new Response("queued-mod-data", {
        headers: { "content-length": "15" },
      });
    }) as typeof fetch;

    try {
      const queued = await enqueueDownloadJob({
        input: {
          category: "mods",
          file: {
            displayName: "Queued Mod 1.0",
            downloadUrl: "https://downloads.example.test/queued-mod.jar",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "queued-mod.jar",
            gameVersions: ["1.20.4"],
            id: 654,
            modLoaders: ["fabric"],
            releaseType: "release",
          },
          instanceId: instance.id,
          projectId: 321,
          projectName: "Queued Mod",
          projectSlug: "queued-mod",
        },
        kind: "curseForgeFile",
      });
      let finalJob = listDownloadJobs().find((job) => job.id === queued.id);

      for (
        let attempt = 0;
        attempt < 50 && finalJob?.status !== "completed";
        attempt++
      ) {
        await wait(10);
        finalJob = listDownloadJobs().find((job) => job.id === queued.id);
      }

      expect(requests).toEqual([
        "https://downloads.example.test/queued-mod.jar",
      ]);
      expect(finalJob).toMatchObject({
        error: null,
        source: "curseforge",
        status: "completed",
        title: "Queued Mod",
        totalItems: 1,
      });
      expect(finalJob?.items[0]).toMatchObject({
        label: "queued-mod.jar",
        status: "completed",
      });
      expect(finalJob?.result?.kind).toBe("curseForgeFile");
      expect(
        readFileSync(join(instance.folders.mods, "queued-mod.jar"), "utf8"),
      ).toBe("queued-mod-data");
    } finally {
      globalThis.fetch = originalFetch;
      clearFinishedDownloadJobs();
    }
  });

  test("updates CurseForge queue progress while file bytes stream", async () => {
    const { clearFinishedDownloadJobs, enqueueDownloadJob, listDownloadJobs } =
      await import("../src/bun/launcher/download-queue");
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "Streaming CurseForge Install",
      versionId: "1.20.4",
    });
    const originalFetch = globalThis.fetch;
    const requests: Array<string> = [];
    const encoder = new TextEncoder();
    const streamState: {
      controller: ReadableStreamDefaultController<Uint8Array> | null;
    } = { controller: null };
    let resolveStreamStarted: () => void = () => undefined;
    const streamStarted = new Promise<void>((resolve) => {
      resolveStreamStarted = resolve;
    });

    globalThis.fetch = (async (input) => {
      requests.push(input.toString());

      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            streamState.controller = controller;
            controller.enqueue(encoder.encode("queued-"));
            resolveStreamStarted();
          },
        }),
        { headers: { "content-length": "15" } },
      );
    }) as typeof fetch;

    try {
      const queued = await enqueueDownloadJob({
        input: {
          category: "mods",
          file: {
            displayName: "Streaming Mod 1.0",
            downloadUrl: "https://downloads.example.test/streaming-mod.jar",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "streaming-mod.jar",
            gameVersions: ["1.20.4"],
            id: 655,
            modLoaders: ["fabric"],
            releaseType: "release",
          },
          instanceId: instance.id,
          projectId: 322,
          projectName: "Streaming Mod",
          projectSlug: "streaming-mod",
        },
        kind: "curseForgeFile",
      });

      await streamStarted;

      let runningJob = listDownloadJobs().find((job) => job.id === queued.id);

      for (
        let attempt = 0;
        attempt < 50 &&
        (runningJob?.status !== "running" ||
          !runningJob.progress ||
          runningJob.progress >= 100);
        attempt++
      ) {
        await wait(10);
        runningJob = listDownloadJobs().find((job) => job.id === queued.id);
      }

      expect(requests).toEqual([
        "https://downloads.example.test/streaming-mod.jar",
      ]);
      expect(runningJob?.status).toBe("running");
      expect(runningJob?.progress).toBeGreaterThan(0);
      expect(runningJob?.progress).toBeLessThan(100);
      expect(runningJob?.activeLabel).toBe("streaming-mod.jar");
      expect(runningJob?.items[0]).toMatchObject({
        downloadedBytes: 7,
        label: "streaming-mod.jar",
        progress: expect.any(Number),
        status: "running",
        totalBytes: 15,
      });

      const streamController = streamState.controller;
      expect(streamController).not.toBeNull();
      if (!streamController) {
        throw new Error("Expected streaming response controller.");
      }
      streamController.enqueue(encoder.encode("mod-data"));
      streamController.close();

      let finalJob = listDownloadJobs().find((job) => job.id === queued.id);

      for (
        let attempt = 0;
        attempt < 50 && finalJob?.status !== "completed";
        attempt++
      ) {
        await wait(10);
        finalJob = listDownloadJobs().find((job) => job.id === queued.id);
      }

      expect(finalJob).toMatchObject({
        activeLabel: null,
        progress: 100,
        source: "curseforge",
        status: "completed",
        title: "Streaming Mod",
        totalItems: 1,
      });
      expect(finalJob?.items[0]).toMatchObject({
        downloadedBytes: 15,
        progress: 100,
        status: "completed",
        totalBytes: 15,
      });
      expect(
        readFileSync(join(instance.folders.mods, "streaming-mod.jar"), "utf8"),
      ).toBe("queued-mod-data");
    } finally {
      globalThis.fetch = originalFetch;
      clearFinishedDownloadJobs();
    }
  });

  test("records actual CurseForge byte totals when content length is unknown", async () => {
    const { clearFinishedDownloadJobs, enqueueDownloadJob, listDownloadJobs } =
      await import("../src/bun/launcher/download-queue");
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "Unknown Size CurseForge Install",
      versionId: "1.20.4",
    });
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (_input: string | URL | Request) =>
      new Response("unknown-size-mod", {
        headers: { "content-type": "application/java-archive" },
      })) as typeof fetch;

    try {
      const queued = await enqueueDownloadJob({
        input: {
          category: "mods",
          file: {
            displayName: "Unknown Size Mod 1.0",
            downloadUrl: "https://downloads.example.test/unknown-size.jar",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "unknown-size.jar",
            gameVersions: ["1.20.4"],
            id: 656,
            modLoaders: ["fabric"],
            releaseType: "release",
          },
          instanceId: instance.id,
          projectId: 323,
          projectName: "Unknown Size Mod",
          projectSlug: "unknown-size-mod",
        },
        kind: "curseForgeFile",
      });

      let finalJob = listDownloadJobs().find((job) => job.id === queued.id);

      for (
        let attempt = 0;
        attempt < 50 && finalJob?.status !== "completed";
        attempt++
      ) {
        await wait(10);
        finalJob = listDownloadJobs().find((job) => job.id === queued.id);
      }

      expect(finalJob).toMatchObject({
        progress: 100,
        status: "completed",
        totalItems: 1,
      });
      expect(finalJob?.items[0]).toMatchObject({
        downloadedBytes: 16,
        progress: 100,
        status: "completed",
        totalBytes: 16,
      });
      expect(
        readFileSync(join(instance.folders.mods, "unknown-size.jar"), "utf8"),
      ).toBe("unknown-size-mod");
    } finally {
      globalThis.fetch = originalFetch;
      clearFinishedDownloadJobs();
    }
  });

  test("reports queued CurseForge modpack progress across dependency downloads", async () => {
    const { clearFinishedDownloadJobs, enqueueDownloadJob, listDownloadJobs } =
      await import("../src/bun/launcher/download-queue");
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const packArchive = createStoredZip({
      "manifest.json": JSON.stringify({
        files: [
          {
            fileID: 333,
            projectID: 222,
            required: true,
          },
        ],
        manifestType: "minecraftModpack",
        manifestVersion: 1,
        minecraft: {
          modLoaders: [{ id: "fabric-0.15.7", primary: true }],
          version: "1.20.4",
        },
        name: "Queued Progress Pack",
        version: "1.0.0",
      }),
    });
    const originalFetch = globalThis.fetch;
    const originalApiKey = Bun.env.NYXEN_CURSEFORGE_API_KEY;
    const encoder = new TextEncoder();
    const streamState: {
      controller: ReadableStreamDefaultController<Uint8Array> | null;
    } = { controller: null };
    let dependencyStreamClosed = false;
    let resolveDependencyStarted: () => void = () => undefined;
    const dependencyStarted = new Promise<void>((resolve) => {
      resolveDependencyStarted = resolve;
    });

    Bun.env.NYXEN_CURSEFORGE_API_KEY = "test-curseforge-key";
    globalThis.fetch = (async (input) => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === "https://downloads.example.test/progress-pack.zip") {
        return new Response(Buffer.from(packArchive), {
          headers: { "content-length": String(packArchive.byteLength) },
        });
      }

      if (url === "https://api.curseforge.com/v1/mods/222/files/333") {
        return jsonResponse({
          data: {
            displayName: "Progress Dependency",
            downloadUrl:
              "https://downloads.example.test/progress-dependency.jar",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "progress-dependency.jar",
            gameVersions: ["1.20.4", "Fabric"],
            id: 333,
            releaseType: 1,
          },
        });
      }

      if (url === "https://downloads.example.test/progress-dependency.jar") {
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              streamState.controller = controller;
              controller.enqueue(encoder.encode("depend"));
              resolveDependencyStarted();
            },
          }),
          { headers: { "content-length": "10" } },
        );
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    try {
      const queued = await enqueueDownloadJob({
        input: {
          category: "modpacks",
          file: {
            displayName: "Queued Progress Pack 1.0.0",
            downloadUrl: "https://downloads.example.test/progress-pack.zip",
            fileDate: "2024-02-01T00:00:00Z",
            fileName: "progress-pack.zip",
            gameVersions: ["1.20.4", "Fabric"],
            id: 444,
            modLoaders: ["fabric"],
            releaseType: "release",
          },
          projectId: 111,
          projectName: "Queued Progress Pack",
          projectSlug: "queued-progress-pack",
        },
        kind: "curseForgeFile",
      });

      await dependencyStarted;

      let runningJob = listDownloadJobs().find((job) => job.id === queued.id);

      for (
        let attempt = 0;
        attempt < 50 &&
        (() => {
          const dependencyItem = runningJob?.items.find(
            (item) => item.id === "curseforge:222:333",
          );

          return (
            runningJob?.totalItems !== 2 ||
            runningJob?.status !== "running" ||
            dependencyItem?.downloadedBytes !== 6 ||
            !runningJob.progress ||
            runningJob.progress <= 50 ||
            runningJob.progress >= 100
          );
        })();
        attempt++
      ) {
        await wait(10);
        runningJob = listDownloadJobs().find((job) => job.id === queued.id);
      }

      const dependencyItem = runningJob?.items.find(
        (item) => item.id === "curseforge:222:333",
      );

      expect(runningJob?.metadata).toMatchObject({
        category: "modpacks",
        kind: "curseForgeFile",
        projectId: 111,
      });
      expect(runningJob?.totalItems).toBe(2);
      expect(runningJob?.progress).toBeGreaterThan(50);
      expect(runningJob?.progress).toBeLessThan(100);
      expect(runningJob?.activeLabel).toBe("progress-dependency.jar");
      expect(dependencyItem).toMatchObject({
        downloadedBytes: 6,
        label: "progress-dependency.jar",
        status: "running",
        totalBytes: 10,
      });

      const streamController = streamState.controller;
      expect(streamController).not.toBeNull();
      if (!streamController) {
        throw new Error("Expected dependency response controller.");
      }
      streamController.enqueue(encoder.encode("ency"));
      streamController.close();
      dependencyStreamClosed = true;

      let finalJob = listDownloadJobs().find((job) => job.id === queued.id);

      for (
        let attempt = 0;
        attempt < 50 && finalJob?.status !== "completed";
        attempt++
      ) {
        await wait(10);
        finalJob = listDownloadJobs().find((job) => job.id === queued.id);
      }

      expect(finalJob).toMatchObject({
        activeLabel: null,
        progress: 100,
        status: "completed",
        title: "Queued Progress Pack",
        totalItems: 2,
      });
      expect(finalJob?.result?.kind).toBe("curseForgeFile");
      if (finalJob?.result?.kind !== "curseForgeFile") {
        throw new Error("Expected CurseForge modpack result.");
      }
      expect(finalJob.result.result.instance?.modpack).toMatchObject({
        installedFiles: 1,
        projectId: "111",
      });
    } finally {
      if (streamState.controller && !dependencyStreamClosed) {
        streamState.controller.close();
      }
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) {
        delete Bun.env.NYXEN_CURSEFORGE_API_KEY;
      } else {
        Bun.env.NYXEN_CURSEFORGE_API_KEY = originalApiKey;
      }
      clearFinishedDownloadJobs();
    }
  });

  test("queues launch artifact preparation in backend-owned download state", async () => {
    const { clearFinishedDownloadJobs, enqueueDownloadJob, listDownloadJobs } =
      await import("../src/bun/launcher/download-queue");
    const { createLauncherInstance, listLauncherInstances } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      bannerUrl: "https://media.example.test/queued-launch-banner.png",
      iconUrl: "https://media.example.test/queued-launch-icon.png",
      name: "Queued Launch Prep",
      versionId: "1.20.4",
    });
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      { fetcher: fakeFetch },
    );
    const artifactPaths = plan.missingArtifacts.map(
      (artifact) => artifact.path,
    );

    for (const artifact of plan.missingArtifacts) {
      mkdirSync(dirname(artifact.path), { recursive: true });
      writeFileSync(
        artifact.path,
        artifact.kind === "assetIndex" ? JSON.stringify({ objects: {} }) : "",
      );
    }

    try {
      const queued = await enqueueDownloadJob({
        input: { instanceId: instance.id },
        kind: "launchArtifacts",
      });
      let finalJob = listDownloadJobs().find((job) => job.id === queued.id);

      for (
        let attempt = 0;
        attempt < 50 && finalJob?.status !== "completed";
        attempt++
      ) {
        await wait(10);
        finalJob = listDownloadJobs().find((job) => job.id === queued.id);
      }

      expect(finalJob).toMatchObject({
        error: null,
        source: "launch",
        status: "completed",
        title: "Prepare Queued Launch Prep",
      });
      expect(finalJob?.result).toEqual({
        kind: "launchArtifacts",
        result: { failed: [], succeeded: 0 },
      });
      expect(
        listLauncherInstances().find((item) => item.id === instance.id),
      ).toMatchObject({
        bannerUrl: instance.bannerUrl,
        iconUrl: instance.iconUrl,
      });
    } finally {
      clearFinishedDownloadJobs();
      for (const path of artifactPaths) {
        rmSync(path, { force: true });
      }
    }
  });

  test("legacy download RPC handlers also publish backend queue state", async () => {
    const { downloadCurseForgeFile } = await import(
      "../src/bun/rpc/handlers/launcher"
    );
    const { clearFinishedDownloadJobs, listDownloadJobs } = await import(
      "../src/bun/launcher/download-queue"
    );
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "Legacy Queue Caller",
      versionId: "1.20.4",
    });
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (_input: string | URL | Request) =>
      new Response("legacy-mod-data", {
        headers: { "content-length": "15" },
      })) as unknown as typeof fetch;

    try {
      const result = await downloadCurseForgeFile({
        category: "mods",
        file: {
          displayName: "Legacy Queued Mod 1.0",
          downloadUrl: "https://downloads.example.test/legacy-queued-mod.jar",
          fileDate: "2024-02-01T00:00:00Z",
          fileName: "legacy-queued-mod.jar",
          gameVersions: ["1.20.4"],
          id: 655,
          modLoaders: ["fabric"],
          releaseType: "release",
        },
        instanceId: instance.id,
        projectId: 322,
        projectName: "Legacy Queued Mod",
        projectSlug: "legacy-queued-mod",
      });
      const job = listDownloadJobs().find(
        (item) =>
          item.source === "curseforge" && item.title === "Legacy Queued Mod",
      );

      expect(result.fileName).toBe("legacy-queued-mod.jar");
      expect(job).toMatchObject({
        error: null,
        status: "completed",
        totalItems: 1,
      });
      expect(job?.result?.kind).toBe("curseForgeFile");
    } finally {
      globalThis.fetch = originalFetch;
      clearFinishedDownloadJobs();
    }
  });

  test("Minecraft version refresh RPC publishes backend queue state", async () => {
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/rpc/handlers/launcher"
    );
    const { clearFinishedDownloadJobs, listDownloadJobs } = await import(
      "../src/bun/launcher/download-queue"
    );
    const originalFetch = globalThis.fetch;

    globalThis.fetch = fakeFetch as typeof fetch;

    try {
      const manifest = await refreshMinecraftVersionManifest();
      const job = listDownloadJobs().find(
        (item) => item.title === "Refresh Minecraft Versions",
      );

      expect(manifest.latest.release).toBe("1.20.4");
      expect(job).toMatchObject({
        error: null,
        status: "completed",
        totalItems: 1,
      });
      expect(job?.result?.kind).toBe("minecraftVersionManifest");
    } finally {
      globalThis.fetch = originalFetch;
      clearFinishedDownloadJobs();
    }
  });

  test("installs manually downloaded CurseForge files from Downloads", async () => {
    const { installDownloadedCurseForgeFile } = await import(
      "../src/bun/launcher/instance-content"
    );
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { refreshMinecraftVersionManifest } = await import(
      "../src/bun/launcher/versions"
    );

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    const instance = createLauncherInstance({
      name: "CurseForge Manual Install",
      versionId: "1.20.4",
    });
    const downloadsDirectory = join(dataRoot, "manual-downloads");
    mkdirSync(downloadsDirectory, { recursive: true });
    writeFileSync(join(downloadsDirectory, "manual-mod.jar"), "manual-data");

    const result = await installDownloadedCurseForgeFile({
      category: "mods",
      downloadsDirectory,
      file: {
        displayName: "Manual Mod 1.0",
        downloadUrl: null,
        fileDate: "2024-02-01T00:00:00Z",
        fileName: "manual-mod.jar",
        gameVersions: ["1.20.4"],
        id: 789,
        modLoaders: ["fabric"],
        releaseType: "release",
      },
      instanceId: instance.id,
      projectId: 321,
      projectName: "Manual Mod",
      projectSlug: "manual-mod",
    });

    expect(result.sourcePath).toBe(join(downloadsDirectory, "manual-mod.jar"));
    expect(
      readFileSync(join(instance.folders.mods, "manual-mod.jar"), "utf8"),
    ).toBe("manual-data");
    expect(existsSync(join(downloadsDirectory, "manual-mod.jar"))).toBe(true);
    expect(result.content?.curseForge.mods?.[0]).toMatchObject({
      fileId: "789",
      fileName: "manual-mod.jar",
      projectId: "321",
      slug: "manual-mod",
    });
  });

  test("searches CurseForge modpacks through the backend API client", async () => {
    const { searchCurseForgeProjects } = await import(
      "../src/bun/launcher/curseforge"
    );
    const request = {
      apiKey: null as string | null,
      url: null as URL | null,
    };
    const fetcher = async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();
      request.url = new URL(url);
      request.apiKey = new Headers(init?.headers).get("x-api-key");

      return jsonResponse({
        data: [
          {
            allowModDistribution: true,
            authors: [{ name: "Fabulously Team" }],
            categories: [{ name: "Performance" }],
            classId: 4471,
            dateModified: "2024-02-01T00:00:00Z",
            downloadCount: 1_234_567,
            id: 123,
            isAvailable: true,
            isFeatured: true,
            latestFiles: [
              {
                displayName: "Fabulously Optimized 1.20.4",
                downloadUrl:
                  "https://edge.forgecdn.net/files/1234/567/fabulously.zip",
                fileDate: "2024-02-01T00:00:00Z",
                fileName: "fabulously.zip",
                gameVersions: ["1.20.4", "Fabric"],
                id: 456,
                releaseType: 1,
              },
            ],
            latestFilesIndexes: [
              {
                fileId: 456,
                gameVersion: "1.20.4",
                modLoader: 4,
              },
            ],
            links: {
              websiteUrl:
                "https://www.curseforge.com/minecraft/modpacks/fabulously-optimized",
            },
            logo: {
              url: "https://media.forgecdn.net/avatars/pack.png",
            },
            name: "Fabulously Optimized",
            slug: "fabulously-optimized",
            summary: "Performance-focused Minecraft client modpack.",
          },
        ],
        pagination: {
          index: 0,
          pageSize: 25,
          resultCount: 1,
          totalCount: 1,
        },
      });
    };

    const result = await searchCurseForgeProjects(
      {
        gameVersion: "1.20.4",
        loader: "fabric",
        pageSize: 25,
        query: "optimized",
        section: "modpacks",
        sortField: "downloads",
      },
      {
        apiKey: "test-curseforge-key",
        baseUrl: "https://curseforge.test",
        fetcher,
      },
    );

    if (!request.url) {
      throw new Error("Expected CurseForge fetch to be called.");
    }

    expect(request.url.pathname).toBe("/v1/mods/search");
    expect(request.url.searchParams.get("gameId")).toBe("432");
    expect(request.url.searchParams.get("classId")).toBe("4471");
    expect(request.url.searchParams.get("searchFilter")).toBe("optimized");
    expect(request.url.searchParams.get("gameVersion")).toBe("1.20.4");
    expect(request.url.searchParams.get("modLoaderType")).toBe("4");
    expect(request.url.searchParams.get("sortField")).toBe("6");
    expect(request.apiKey).toBe("test-curseforge-key");
    expect(result.source).toEqual({
      classId: 4471,
      gameId: 432,
      section: "modpacks",
    });
    expect(result.data[0]).toMatchObject({
      authors: ["Fabulously Team"],
      categories: ["Performance"],
      downloadCount: 1_234_567,
      id: 123,
      modLoaders: ["fabric"],
      name: "Fabulously Optimized",
      section: "modpacks",
      slug: "fabulously-optimized",
    });
    expect(result.data[0]?.latestFile).toMatchObject({
      downloadUrl: "https://edge.forgecdn.net/files/1234/567/fabulously.zip",
      fileName: "fabulously.zip",
      modLoaders: ["fabric"],
      releaseType: "release",
    });
  });

  test("searches broader CurseForge Minecraft content sections", async () => {
    const { searchCurseForgeProjects } = await import(
      "../src/bun/launcher/curseforge"
    );
    const cases: Array<{
      classId: number;
      section: CurseForgeProjectSection;
    }> = [
      { classId: 6, section: "mods" },
      { classId: 4471, section: "modpacks" },
      { classId: 12, section: "resource-packs" },
      { classId: 6552, section: "shaders" },
      { classId: 17, section: "worlds" },
    ];

    for (const entry of cases) {
      const fetcher = async (
        input: string | URL | Request,
      ): Promise<Response> => {
        const url = input instanceof Request ? input.url : input.toString();
        const requestUrl = new URL(url);

        expect(requestUrl.searchParams.get("classId")).toBe(
          String(entry.classId),
        );

        return jsonResponse({
          data: [
            {
              classId: entry.classId,
              downloadCount: 10,
              id: entry.classId + 1000,
              name: `${entry.section} project`,
              slug: `${entry.section}-project`,
            },
          ],
        });
      };

      const result = await searchCurseForgeProjects(
        {
          pageSize: 1,
          section: entry.section,
        },
        {
          apiKey: "test-curseforge-key",
          baseUrl: "https://curseforge.test",
          fetcher,
        },
      );

      expect(result.source).toEqual({
        classId: entry.classId,
        gameId: 432,
        section: entry.section,
      });
      expect(result.data[0]?.section).toBe(entry.section);
    }
  });

  test("explains missing CurseForge API key configuration", async () => {
    const { searchCurseForgeProjects } = await import(
      "../src/bun/launcher/curseforge"
    );
    const previousNyxenKey = process.env.NYXEN_CURSEFORGE_API_KEY;
    const previousGenericKey = process.env.CURSEFORGE_API_KEY;

    delete process.env.NYXEN_CURSEFORGE_API_KEY;
    delete process.env.CURSEFORGE_API_KEY;

    try {
      await expect(
        searchCurseForgeProjects({ section: "modpacks" }),
      ).rejects.toThrow("NYXEN_CURSEFORGE_API_KEY");
    } finally {
      if (previousNyxenKey === undefined) {
        delete process.env.NYXEN_CURSEFORGE_API_KEY;
      } else {
        process.env.NYXEN_CURSEFORGE_API_KEY = previousNyxenKey;
      }

      if (previousGenericKey === undefined) {
        delete process.env.CURSEFORGE_API_KEY;
      } else {
        process.env.CURSEFORGE_API_KEY = previousGenericKey;
      }
    }
  });

  test("searches Modrinth modpacks through the backend API client", async () => {
    const { searchModrinthProjects } = await import(
      "../src/bun/launcher/modrinth"
    );
    const requestedUrls: Array<URL> = [];
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = new URL(
        input instanceof Request ? input.url : input.toString(),
      );
      requestedUrls.push(url);

      if (url.pathname === "/v2/search") {
        return jsonResponse({
          hits: [
            {
              author: "Modrinth Author",
              categories: ["fabric", "adventure"],
              date_modified: "2024-03-02T00:00:00Z",
              description: "Performance-focused Modrinth pack.",
              display_categories: ["Adventure"],
              downloads: 2000,
              follows: 300,
              gallery: ["https://cdn.modrinth.test/gallery.png"],
              icon_url: "https://cdn.modrinth.test/icon.png",
              project_id: "AABBCCDD",
              project_type: "modpack",
              slug: "modrinth-pack",
              title: "Modrinth Pack",
              versions: ["1.20.4"],
            },
          ],
          limit: 12,
          offset: 0,
          total_hits: 1,
        });
      }

      if (url.pathname === "/v2/project/AABBCCDD/version") {
        return jsonResponse([
          {
            date_published: "2024-03-03T00:00:00Z",
            files: [
              {
                filename: "modrinth-pack.mrpack",
                hashes: { sha1: "pack-sha1" },
                primary: true,
                size: 123,
                url: "https://cdn.modrinth.test/modrinth-pack.mrpack",
              },
            ],
            game_versions: ["1.20.4"],
            id: "version-one",
            loaders: ["fabric"],
            name: "Version One",
            version_number: "1.0.0",
            version_type: "release",
          },
        ]);
      }

      return new Response("not found", { status: 404 });
    };

    const result = await searchModrinthProjects(
      {
        gameVersion: "1.20.4",
        loader: "fabric",
        pageSize: 12,
        section: "modpacks",
      },
      {
        baseUrl: "https://api.modrinth.test/v2",
        fetcher,
      },
    );

    const searchUrl = requestedUrls.find(
      (url) => url.pathname === "/v2/search",
    );
    if (!searchUrl) {
      throw new Error("Expected Modrinth search fetch to be called.");
    }

    expect(JSON.parse(searchUrl.searchParams.get("facets") ?? "[]")).toEqual([
      ["project_type:modpack"],
      ["versions:1.20.4"],
      ["categories:fabric"],
    ]);
    expect(searchUrl.searchParams.get("index")).toBe("downloads");
    expect(result.data[0]).toMatchObject({
      authors: ["Modrinth Author"],
      downloadCount: 2000,
      id: "AABBCCDD",
      latestFile: {
        downloadUrl: "https://cdn.modrinth.test/modrinth-pack.mrpack",
        fileName: "modrinth-pack.mrpack",
        id: "version-one",
      },
      section: "modpacks",
      slug: "modrinth-pack",
      websiteUrl: "https://modrinth.com/modpack/modrinth-pack",
    });
  });

  test("installs Modrinth modpacks as locked instances", async () => {
    const { downloadModrinthFile } = await import(
      "../src/bun/launcher/instance-content"
    );
    const modData = new TextEncoder().encode("mod contents");
    const modHash = createHash("sha1").update(modData).digest("hex");
    const packArchive = createStoredZip({
      "modrinth.index.json": JSON.stringify({
        dependencies: {
          "fabric-loader": "0.16.10",
          minecraft: "1.20.4",
        },
        files: [
          {
            downloads: ["https://cdn.modrinth.test/mods/performance.jar"],
            fileSize: modData.byteLength,
            hashes: { sha1: modHash },
            path: "mods/performance.jar",
          },
        ],
        formatVersion: 1,
        game: "minecraft",
        name: "Modrinth Installed Pack",
        versionId: "1.0.0",
      }),
      "overrides/config/performance.toml": "enabled = true\n",
    });
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === "https://cdn.modrinth.test/modrinth-pack.mrpack") {
        return new Response(Buffer.from(packArchive));
      }

      if (url === "https://cdn.modrinth.test/mods/performance.jar") {
        return new Response(Buffer.from(modData));
      }

      return new Response("not found", { status: 404 });
    };

    const result = await downloadModrinthFile(
      {
        category: "modpacks",
        file: {
          displayName: "Modrinth Installed Pack 1.0.0",
          downloadUrl: "https://cdn.modrinth.test/modrinth-pack.mrpack",
          fileDate: "2024-03-03T00:00:00Z",
          fileName: "modrinth-pack.mrpack",
          gameVersions: ["1.20.4"],
          hashes: {},
          id: "version-one",
          modLoaders: ["fabric"],
          releaseType: "release",
          sizeBytes: packArchive.byteLength,
          versionNumber: "1.0.0",
        },
        projectId: "AABBCCDD",
        projectName: "Modrinth Installed Pack",
        projectSlug: "modrinth-installed-pack",
        projectWebsiteUrl:
          "https://modrinth.com/modpack/modrinth-installed-pack",
      },
      { fetcher },
    );

    const instance = result.instance;
    if (!instance?.modpack) {
      throw new Error("Expected Modrinth modpack install to create instance.");
    }

    expect(instance.loader).toBe("fabric");
    expect(instance.loaderVersion).toBe("0.16.10");
    expect(instance.versionId).toBe("1.20.4");
    expect(instance.modpack).toMatchObject({
      fileId: "version-one",
      installedFiles: 1,
      projectId: "AABBCCDD",
      skippedFiles: 0,
      source: "modrinth",
      version: "1.0.0",
    });
    expect(existsSync(join(instance.folders.mods, "performance.jar"))).toBe(
      true,
    );
    expect(
      readFileSync(
        join(instance.gameDirectory, "config", "performance.toml"),
        "utf8",
      ),
    ).toBe("enabled = true\n");
    expect(result.content?.recipe).toMatchObject({
      counts: {
        managedFiles: 1,
        overrides: 1,
      },
      status: "clean",
    });
    expect(result.content?.recipe?.revision.source).toMatchObject({
      fileId: "version-one",
      kind: "modrinth",
      projectId: "AABBCCDD",
    });
    expect(result.content?.recipe?.revision.files[0]).toMatchObject({
      optional: false,
      path: "mods/performance.jar",
      policy: "managed",
      source: "modrinth",
    });
  });

  test("detects recipe drift for Modrinth modpack instances", async () => {
    const { downloadModrinthFile, getInstanceContent } = await import(
      "../src/bun/launcher/instance-content"
    );
    const modData = new TextEncoder().encode("mod contents");
    const modHash = createHash("sha1").update(modData).digest("hex");
    const packArchive = createStoredZip({
      "modrinth.index.json": JSON.stringify({
        dependencies: {
          "fabric-loader": "0.16.10",
          minecraft: "1.20.4",
        },
        files: [
          {
            downloads: ["https://cdn.modrinth.test/mods/performance.jar"],
            fileSize: modData.byteLength,
            hashes: { sha1: modHash },
            path: "mods/performance.jar",
          },
        ],
        formatVersion: 1,
        game: "minecraft",
        name: "Drift Test Pack",
        versionId: "1.0.0",
      }),
      "overrides/config/performance.toml": "enabled = true\n",
    });
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === "https://cdn.modrinth.test/drift-pack.mrpack") {
        return new Response(Buffer.from(packArchive));
      }

      if (url === "https://cdn.modrinth.test/mods/performance.jar") {
        return new Response(Buffer.from(modData));
      }

      return new Response("not found", { status: 404 });
    };

    const result = await downloadModrinthFile(
      {
        category: "modpacks",
        file: {
          displayName: "Drift Test Pack 1.0.0",
          downloadUrl: "https://cdn.modrinth.test/drift-pack.mrpack",
          fileDate: "2024-03-03T00:00:00Z",
          fileName: "drift-pack.mrpack",
          gameVersions: ["1.20.4"],
          hashes: {},
          id: "version-one",
          modLoaders: ["fabric"],
          releaseType: "release",
          sizeBytes: packArchive.byteLength,
          versionNumber: "1.0.0",
        },
        projectId: "DRIFTTEST",
        projectName: "Drift Test Pack",
        projectSlug: "drift-test-pack",
        projectWebsiteUrl: "https://modrinth.com/modpack/drift-test-pack",
      },
      { fetcher },
    );

    const instance = result.instance;
    if (!instance) {
      throw new Error("Expected Modrinth modpack install to create instance.");
    }

    writeFileSync(join(instance.folders.mods, "performance.jar"), "changed");
    writeFileSync(join(instance.folders.mods, "extra.jar"), "extra");
    rmSync(join(instance.gameDirectory, "config", "performance.toml"), {
      force: true,
    });

    const content = getInstanceContent({ instanceId: instance.id });

    expect(content.recipe?.status).toBe("drifted");
    expect(content.recipe?.counts).toMatchObject({
      added: 1,
      changed: 1,
      missing: 1,
    });
    expect(
      content.recipe?.drift.map((item) => `${item.status}:${item.path}`),
    ).toEqual(
      expect.arrayContaining([
        "added:mods/extra.jar",
        "changed:mods/performance.jar",
        "missing:config/performance.toml",
      ]),
    );
  });

  test("resolves Fabric launch metadata and maven artifacts", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      { fetcher: fakeFetch },
    );

    const instance = createLauncherInstance({
      loader: "fabric",
      loaderVersion: "0.15.7",
      name: "Fabric Survival",
      versionId: "1.20.4",
    });
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      { fetcher: fakeFabricFetch },
    );

    expect(plan.modLoader).toMatchObject({
      installerPath: null,
      kind: "fabric",
      minecraftVersionId: "1.20.4",
      version: "0.15.7",
    });
    expect(plan.minecraft.baseVersionId).toBe("1.20.4");
    expect(plan.minecraft.versionId).toBe("fabric-loader-0.15.7-1.20.4");
    expect(plan.minecraft.mainClass).toBe(
      "net.fabricmc.loader.impl.launch.knot.KnotClient",
    );
    expect(plan.classpath.some((path) => path.includes("fabric-loader"))).toBe(
      true,
    );
    expect(
      plan.missingArtifacts.some(
        (artifact) =>
          artifact.id === "net.fabricmc:fabric-loader:0.15.7" &&
          artifact.url ===
            "https://maven.fabricmc.net/net/fabricmc/fabric-loader/0.15.7/fabric-loader-0.15.7.jar",
      ),
    ).toBe(true);
    expect(plan.warnings).not.toContain(
      "Mod loader resolution is not implemented yet.",
    );
  });

  test("resolves Quilt launch metadata and maven artifacts", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      { fetcher: fakeFetch },
    );

    const instance = createLauncherInstance({
      loader: "quilt",
      loaderVersion: "0.26.4",
      name: "Quilt Survival",
      versionId: "1.20.4",
    });
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      { fetcher: fakeQuiltFetch },
    );

    expect(plan.modLoader).toMatchObject({
      installerPath: null,
      kind: "quilt",
      minecraftVersionId: "1.20.4",
      version: "0.26.4",
    });
    expect(plan.minecraft.versionId).toBe("quilt-loader-0.26.4-1.20.4");
    expect(plan.minecraft.mainClass).toBe(
      "org.quiltmc.loader.impl.launch.knot.KnotClient",
    );
    expect(
      plan.missingArtifacts.some(
        (artifact) =>
          artifact.id === "org.quiltmc:quilt-loader:0.26.4" &&
          artifact.url ===
            "https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-loader/0.26.4/quilt-loader-0.26.4.jar",
      ),
    ).toBe(true);
  });

  test("resolves Forge installer metadata and generated artifacts", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      { fetcher: fakeFetch },
    );

    const instance = createLauncherInstance({
      loader: "forge",
      loaderVersion: "49.0.50",
      name: "Forge Survival",
      versionId: "1.20.4",
    });
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      { fetcher: fakeForgeInstallerFetch, requestTimeoutMs: 100 },
    );
    const generatedArtifact = plan.missingArtifacts.find(
      (artifact) =>
        artifact.id === "net.minecraftforge:forge:1.20.4-49.0.50:client",
    );

    expect(plan.modLoader.kind).toBe("forge");
    expect(plan.modLoader.version).toBe("49.0.50");
    expect(plan.modLoader.installerPath).toContain(
      "forge-1.20.4-49.0.50-installer.jar",
    );
    expect(existsSync(plan.modLoader.installerPath ?? "")).toBe(true);
    expect(plan.minecraft.versionId).toBe("1.20.4-forge-49.0.50");
    expect(plan.minecraft.mainClass).toBe(
      "net.minecraftforge.bootstrap.ForgeBootstrap",
    );
    expect(generatedArtifact?.url).toBe("");
    expect(generatedArtifact?.path).toContain(
      "forge-1.20.4-49.0.50-client.jar",
    );
  });

  test("resolves NeoForge installer metadata and generated artifacts", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      { fetcher: fakeFetch },
    );

    const instance = createLauncherInstance({
      loader: "neoforge",
      loaderVersion: "20.4.237",
      name: "NeoForge Survival",
      versionId: "1.20.4",
    });
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      { fetcher: fakeNeoForgeInstallerFetch, requestTimeoutMs: 100 },
    );
    const generatedArtifact = plan.missingArtifacts.find(
      (artifact) => artifact.id === "net.neoforged:neoforge:20.4.237:client",
    );

    expect(plan.modLoader.kind).toBe("neoforge");
    expect(plan.modLoader.version).toBe("20.4.237");
    expect(plan.modLoader.installerPath).toContain(
      "neoforge-20.4.237-installer.jar",
    );
    expect(existsSync(plan.modLoader.installerPath ?? "")).toBe(true);
    expect(plan.minecraft.versionId).toBe("1.20.4-neoforge-20.4.237");
    expect(plan.minecraft.mainClass).toBe(
      "cpw.mods.bootstraplauncher.BootstrapLauncher",
    );
    expect(generatedArtifact?.url).toBe("");
    expect(generatedArtifact?.path).toContain("neoforge-20.4.237-client.jar");
  });

  test("adds NeoForge generated client artifact from installer profile data", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (
        url ===
        "https://maven.neoforged.net/releases/net/neoforged/neoforge/20.4.238/neoforge-20.4.238-installer.jar"
      ) {
        const archive = createStoredZip({
          "install_profile.json": JSON.stringify({
            data: {
              PATCHED: {
                client: "[net.neoforged:neoforge:20.4.238:client]",
              },
            },
          }),
          "version.json": JSON.stringify({
            arguments: {
              game: ["--launchTarget", "forgeclient"],
              jvm: [],
            },
            id: "neoforge-20.4.238",
            libraries: [
              {
                downloads: {
                  artifact: {
                    path: "cpw/mods/bootstraplauncher/2.0.2/bootstraplauncher-2.0.2.jar",
                    url: "https://maven.neoforged.net/releases/cpw/mods/bootstraplauncher/2.0.2/bootstraplauncher-2.0.2.jar",
                  },
                },
                name: "cpw.mods:bootstraplauncher:2.0.2",
              },
              {
                downloads: {
                  artifact: {
                    path: "com/mojang/brigadier/1.0.18/brigadier-1.0.18.jar",
                    url: "https://libraries.minecraft.net/com/mojang/brigadier/1.0.18/brigadier-1.0.18.jar",
                  },
                },
                name: "com.mojang:brigadier:1.0.18",
              },
            ],
            mainClass: "cpw.mods.bootstraplauncher.BootstrapLauncher",
          }),
        });

        return new Response(
          archive.buffer.slice(
            archive.byteOffset,
            archive.byteOffset + archive.byteLength,
          ) as ArrayBuffer,
        );
      }

      return fakeFetch(input);
    };

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      { fetcher: fakeFetch },
    );

    const instance = createLauncherInstance({
      loader: "neoforge",
      loaderVersion: "20.4.238",
      name: "NeoForge Profile Generated",
      versionId: "1.20.4",
    });
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      { fetcher, requestTimeoutMs: 100 },
    );
    const generatedArtifact = plan.missingArtifacts.find(
      (artifact) => artifact.id === "net.neoforged:neoforge:20.4.238:client",
    );

    expect(generatedArtifact).toMatchObject({
      kind: "library",
      url: "",
    });
    if (!generatedArtifact) {
      throw new Error("Expected generated NeoForge client artifact.");
    }
    expect(generatedArtifact.path).toContain("neoforge-20.4.238-client.jar");
    expect(plan.classpath).not.toContain(generatedArtifact.path);
    expect(
      plan.classpath.filter((path) => path.endsWith("brigadier-1.0.18.jar")),
    ).toHaveLength(1);
  });

  test("tracks platform native libraries listed as ordinary artifacts", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");
    const osName =
      process.platform === "darwin"
        ? "osx"
        : process.platform === "win32"
          ? "windows"
          : "linux";
    const nativeClassifier =
      process.platform === "win32"
        ? "natives-windows"
        : process.platform === "darwin"
          ? "natives-macos"
          : "natives-linux";
    const nativeArtifactPath = `org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-${nativeClassifier}.jar`;
    const nativePathSuffix = join(...nativeArtifactPath.split("/"));
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url.endsWith("/1.20.4.json")) {
        return jsonResponse({
          ...versionDetailsDocument,
          libraries: [
            ...versionDetailsDocument.libraries,
            {
              downloads: {
                artifact: {
                  path: nativeArtifactPath,
                  url: `https://libraries.minecraft.net/${nativeArtifactPath}`,
                },
              },
              name: `org.lwjgl:lwjgl:3.3.3:${nativeClassifier}`,
              rules: [{ action: "allow", os: { name: osName } }],
            },
          ],
        });
      }

      return fakeFetch(input);
    };

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });

    try {
      const instance = createLauncherInstance({
        name: "Native Artifact Metadata",
        versionId: "1.20.4",
      });
      const plan = await createLaunchPlan(
        { instanceId: instance.id, refreshVersionDetails: true },
        { fetcher },
      );
      const nativeArtifact = plan.missingArtifacts.find((artifact) =>
        artifact.path.endsWith(nativePathSuffix),
      );

      expect(
        plan.nativeArtifactPaths.some((path) =>
          path.endsWith(nativePathSuffix),
        ),
      ).toBe(true);
      expect(nativeArtifact).toMatchObject({
        id: `org.lwjgl:lwjgl:3.3.3:${nativeClassifier}`,
        kind: "nativeLibrary",
      });
    } finally {
      await getMinecraftVersionDetails(
        { refresh: true, versionId: "1.20.4" },
        { fetcher: fakeFetch },
      );
    }
  });

  test("runs mod loader installers for generated artifacts without URLs", async () => {
    const { downloadArtifacts } = await import("../src/bun/launcher/download");
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    const installerPath = join(
      directories.downloads,
      "loaders",
      "forge",
      "installer.jar",
    );
    const generatedPath = join(
      directories.libraries,
      "net",
      "minecraftforge",
      "forge",
      "1.20.4-49.0.50",
      "forge-1.20.4-49.0.50-client.jar",
    );
    mkdirSync(dirname(installerPath), { recursive: true });
    writeFileSync(installerPath, "installer");
    const plan = createTestLaunchPlan(directories, {
      missingArtifacts: [
        {
          id: "net.minecraftforge:forge:1.20.4-49.0.50:client",
          kind: "library",
          path: generatedPath,
        },
      ],
      modLoader: {
        installerPath,
        installerUrl:
          "https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.4-49.0.50/forge-1.20.4-49.0.50-installer.jar",
        kind: "forge",
        minecraftVersionId: "1.20.4",
        version: "49.0.50",
      },
    });

    const result = await downloadArtifacts(plan, {
      installerRunner: () => {
        mkdirSync(dirname(generatedPath), { recursive: true });
        writeFileSync(generatedPath, "generated");
      },
    });

    expect(result).toEqual({ failed: [], succeeded: 1 });
    expect(existsSync(generatedPath)).toBe(true);
  });

  test("downloads asset objects after fetching an asset index", async () => {
    const { downloadArtifacts } = await import("../src/bun/launcher/download");
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    const assetIndexPath = join(directories.assets, "indexes", "12.json");
    const assetObjectPath = join(
      directories.assets,
      "objects",
      assetObjectHash.slice(0, 2),
      assetObjectHash,
    );
    const plan = createTestLaunchPlan(directories, {
      missingArtifacts: [
        {
          id: "12",
          kind: "assetIndex",
          path: assetIndexPath,
          url: "https://resources.download.minecraft.net/indexes/12.json",
        },
      ],
    });

    try {
      const result = await downloadArtifacts(plan, {
        fetcher: async (input) => {
          const url = input instanceof Request ? input.url : input.toString();

          if (url.endsWith("/indexes/12.json")) {
            return jsonResponse(assetIndexDocument);
          }

          if (
            url.endsWith(`/${assetObjectHash.slice(0, 2)}/${assetObjectHash}`)
          ) {
            return new Response(assetObjectContents);
          }

          return new Response("not found", { status: 404 });
        },
      });

      expect(result).toEqual({ failed: [], succeeded: 2 });
      expect(JSON.parse(readFileSync(assetIndexPath, "utf8"))).toEqual(
        assetIndexDocument,
      );
      expect(readFileSync(assetObjectPath, "utf8")).toBe(assetObjectContents);
    } finally {
      rmSync(assetIndexPath, { force: true });
      rmSync(assetObjectPath, { force: true });
    }
  });

  test("resolves managed Java runtime link targets relative to the link directory", async () => {
    const { resolveManagedJavaRuntime } = await import(
      "../src/bun/launcher/java-runtimes"
    );
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const runtimeManifestUrl =
      "https://runtime.test/link/java-runtime-all.json";
    const packageManifestUrl =
      "https://runtime.test/link/java-runtime-gamma/manifest.json";
    const versionName = "17.0.link";
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === runtimeManifestUrl) {
        return jsonResponse(
          runtimeAllDocument([
            runtimeEntryDocument({
              manifestUrl: packageManifestUrl,
              versionName,
            }),
          ]),
        );
      }

      if (url === packageManifestUrl) {
        return jsonResponse({
          files: {
            bin: {
              type: "directory",
            },
            "bin/java": {
              downloads: {
                raw: {
                  url: "https://runtime.test/link/bin/java",
                },
              },
              executable: true,
              type: "file",
            },
            "bin/libjli.so": {
              target: "../lib/libjli.so",
              type: "link",
            },
            lib: {
              type: "directory",
            },
            "lib/libjli.so": {
              downloads: {
                raw: {
                  url: "https://runtime.test/link/lib/libjli.so",
                },
              },
              type: "file",
            },
          },
        });
      }

      return fakeFetch(input);
    };

    const requiredJava = {
      component: "java-runtime-gamma",
      majorVersion: 17,
    };
    const runtimeOptions = {
      fetcher,
      manifestCacheTtlMs: 0,
      manifestUrl: runtimeManifestUrl,
    };
    const runtime = await resolveManagedJavaRuntime(
      requiredJava,
      runtimeOptions,
    );
    const directories = getLauncherDirectories();
    const linkPath = join(
      directories.runtimes,
      currentJavaRuntimePlatform(),
      "java-runtime-gamma",
      versionName,
      "bin",
      "libjli.so",
    );

    expect(runtime.versionName).toBe(versionName);
    expect(runtime.missingArtifacts.map((artifact) => artifact.id)).toContain(
      `java-runtime-gamma:${versionName}:lib/libjli.so`,
    );

    if (process.platform !== "win32") {
      expect(lstatSync(linkPath).isSymbolicLink()).toBe(true);
    }

    const repeatedRuntime = await resolveManagedJavaRuntime(
      requiredJava,
      runtimeOptions,
    );

    expect(repeatedRuntime.versionName).toBe(versionName);
  });

  test("rejects managed Java runtime links that escape the runtime directory", async () => {
    const { resolveManagedJavaRuntime } = await import(
      "../src/bun/launcher/java-runtimes"
    );
    const runtimeManifestUrl =
      "https://runtime.test/link-escape/java-runtime-all.json";
    const packageManifestUrl =
      "https://runtime.test/link-escape/java-runtime-gamma/manifest.json";
    const versionName = "17.0.escape";
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === runtimeManifestUrl) {
        return jsonResponse(
          runtimeAllDocument([
            runtimeEntryDocument({
              manifestUrl: packageManifestUrl,
              versionName,
            }),
          ]),
        );
      }

      if (url === packageManifestUrl) {
        return jsonResponse({
          files: {
            bin: {
              type: "directory",
            },
            "bin/java": {
              downloads: {
                raw: {
                  url: "https://runtime.test/link-escape/bin/java",
                },
              },
              executable: true,
              type: "file",
            },
            "bin/libjli.so": {
              target: "../../escape/libjli.so",
              type: "link",
            },
          },
        });
      }

      return fakeFetch(input);
    };

    await expect(
      resolveManagedJavaRuntime(
        {
          component: "java-runtime-gamma",
          majorVersion: 17,
        },
        {
          fetcher,
          manifestCacheTtlMs: 0,
          manifestUrl: runtimeManifestUrl,
        },
      ),
    ).rejects.toThrow("Java runtime link target path cannot leave");
  });

  test("plans managed Java runtime artifacts when app-controlled", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");
    const { updateSetting } = await import("../src/bun/settings/store");

    updateSetting({
      key: "launcher.javaManagement",
      value: "app-controlled",
    });

    try {
      await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
      await getMinecraftVersionDetails(
        { versionId: "1.20.4" },
        { fetcher: fakeFetch },
      );

      const instance = createLauncherInstance({
        javaExecutable: "/usr/bin/java",
        name: "Managed Java",
        versionId: "1.20.4",
      });
      const plan = await createLaunchPlan(
        { instanceId: instance.id },
        { fetcher: fakeRuntimeFetch },
      );
      const runtimeArtifacts = plan.missingArtifacts.filter(
        (artifact) => artifact.kind === "javaRuntime",
      );

      expect(plan.java.management).toBe("app-controlled");
      expect(plan.java.component).toBe("java-runtime-gamma");
      expect(plan.java.majorVersion).toBe(17);
      expect(plan.java.runtimePlatform).toBe(currentJavaRuntimePlatform());
      expect(plan.java.runtimeVersion).toBe("17.0.1");
      expect(plan.java.runtimeDirectory).toContain("java-runtime-gamma");
      expect(plan.java.runtimeDirectory).toContain("17.0.1");
      expect(normalizePathForAssertion(plan.java.executable)).toContain(
        runtimeExecutablePath,
      );
      expect(plan.java.executable).not.toBe("/usr/bin/java");
      expect(runtimeArtifacts).toHaveLength(2);
      expect(runtimeArtifacts.some((artifact) => artifact.executable)).toBe(
        true,
      );
      expect(plan.warnings).toContain(
        "Instance Java executable is ignored while app-controlled Java management is enabled.",
      );
    } finally {
      updateSetting({
        key: "launcher.javaManagement",
        value: "auto",
      });
    }
  });

  test("keeps runtime root entries as directories", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");
    const { updateSetting } = await import("../src/bun/settings/store");

    updateSetting({
      key: "launcher.javaManagement",
      value: "app-controlled",
    });

    try {
      await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
      await getMinecraftVersionDetails(
        { versionId: "1.20.4" },
        { fetcher: fakeFetch },
      );

      const instance = createLauncherInstance({
        name: "Runtime Root Layout",
        versionId: "1.20.4",
      });

      await createLaunchPlan(
        { instanceId: instance.id },
        { fetcher: fakeRuntimeFetch, manifestCacheTtlMs: 0 },
      );

      const directories = getLauncherDirectories();
      const runtimeRootEntries = readdirSync(directories.runtimes, {
        withFileTypes: true,
      });

      expect(runtimeRootEntries.length).toBeGreaterThan(0);
      expect(
        runtimeRootEntries
          .filter((entry) => !entry.isDirectory())
          .map((entry) => entry.name),
      ).toEqual([]);
    } finally {
      updateSetting({
        key: "launcher.javaManagement",
        value: "auto",
      });
    }
  });

  test("migrates legacy runtime metadata files out of the runtime root", async () => {
    const { resolveManagedJavaRuntime } = await import(
      "../src/bun/launcher/java-runtimes"
    );
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    const packageManifestUrl =
      "https://runtime.test/legacy/java-runtime-gamma/manifest.json";
    const versionName = "17.0.legacy-root";
    const legacyMetadataPath = join(
      directories.runtimes,
      "java-runtime-all.json",
    );
    const migratedMetadataPath = join(
      directories.runtimes,
      "_meta",
      "java-runtime-all.json",
    );
    const fetcher = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === packageManifestUrl) {
        return jsonResponse(runtimePackageManifestDocument());
      }

      throw new Error("Expected Java runtime metadata to come from cache.");
    };

    rmSync(legacyMetadataPath, { force: true });
    rmSync(migratedMetadataPath, { force: true });
    mkdirSync(directories.runtimes, { recursive: true });
    writeFileSync(
      legacyMetadataPath,
      JSON.stringify(
        runtimeAllDocument([
          runtimeEntryDocument({
            manifestUrl: packageManifestUrl,
            versionName,
          }),
        ]),
      ),
    );

    const runtime = await resolveManagedJavaRuntime(
      {
        component: "java-runtime-gamma",
        majorVersion: 17,
      },
      {
        fetcher,
      },
    );
    const runtimeRootFiles = readdirSync(directories.runtimes, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    expect(runtime.versionName).toBe(versionName);
    expect(existsSync(legacyMetadataPath)).toBe(false);
    expect(existsSync(migratedMetadataPath)).toBe(true);
    expect(runtimeRootFiles).toEqual([]);
  });

  test("reuses cached Java runtime metadata for repeated app-controlled plans", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");
    const { updateSetting } = await import("../src/bun/settings/store");
    const runtimeManifestUrl =
      "https://runtime.test/cache-speed/java-runtime-all.json";
    const packageManifestUrl =
      "https://runtime.test/cache-speed/java-runtime-gamma/manifest.json";
    let runtimeMetadataRequests = 0;
    const seedRuntimeFetch = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === runtimeManifestUrl) {
        runtimeMetadataRequests++;
        return jsonResponse(
          runtimeAllDocument([
            runtimeEntryDocument({
              manifestUrl: packageManifestUrl,
              versionName: "17.0.9",
            }),
          ]),
        );
      }

      if (url === packageManifestUrl) {
        runtimeMetadataRequests++;
        return jsonResponse(runtimePackageManifestDocument());
      }

      return fakeFetch(input);
    };
    const offlineRuntimeFetch = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === runtimeManifestUrl || url === packageManifestUrl) {
        runtimeMetadataRequests++;
        throw new Error("Expected Java runtime metadata to come from cache.");
      }

      return fakeFetch(input);
    };

    updateSetting({
      key: "launcher.javaManagement",
      value: "app-controlled",
    });

    try {
      await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
      await getMinecraftVersionDetails(
        { versionId: "1.20.4" },
        { fetcher: fakeFetch },
      );

      const instance = createLauncherInstance({
        name: "Cached Managed Java",
        versionId: "1.20.4",
      });

      await createLaunchPlan(
        { instanceId: instance.id },
        {
          fetcher: seedRuntimeFetch,
          javaRuntimeManifestUrl: runtimeManifestUrl,
        },
      );

      const requestsAfterSeed = runtimeMetadataRequests;
      const cachedPlan = await createLaunchPlan(
        { instanceId: instance.id },
        {
          fetcher: offlineRuntimeFetch,
          javaRuntimeManifestUrl: runtimeManifestUrl,
        },
      );

      expect(cachedPlan.java.runtimeVersion).toBe("17.0.9");
      expect(runtimeMetadataRequests).toBe(requestsAfterSeed);
    } finally {
      updateSetting({
        key: "launcher.javaManagement",
        value: "auto",
      });
    }
  });

  test("selects the newest managed Java runtime when metadata order is stale", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");
    const { updateSetting } = await import("../src/bun/settings/store");
    const runtimeManifestUrl =
      "https://runtime.test/newest/java-runtime-all.json";
    const oldManifestUrl =
      "https://runtime.test/java-runtime-gamma/17.0.1/manifest.json";
    const newManifestUrl =
      "https://runtime.test/java-runtime-gamma/17.0.2/manifest.json";
    const newestFirstFetch = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();

      if (url === runtimeManifestUrl) {
        return jsonResponse(
          runtimeAllDocument([
            runtimeEntryDocument({
              manifestUrl: oldManifestUrl,
              released: "2024-01-04T00:00:00+00:00",
              versionName: "17.0.1",
            }),
            runtimeEntryDocument({
              manifestUrl: newManifestUrl,
              released: "2024-02-04T00:00:00+00:00",
              versionName: "17.0.2",
            }),
          ]),
        );
      }

      if (url === oldManifestUrl || url === newManifestUrl) {
        return jsonResponse(runtimePackageManifestDocument());
      }

      return fakeFetch(input);
    };

    updateSetting({
      key: "launcher.javaManagement",
      value: "app-controlled",
    });

    try {
      await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
      await getMinecraftVersionDetails(
        { versionId: "1.20.4" },
        { fetcher: fakeFetch },
      );

      const instance = createLauncherInstance({
        name: "Newest Managed Java",
        versionId: "1.20.4",
      });
      const plan = await createLaunchPlan(
        { instanceId: instance.id },
        {
          fetcher: newestFirstFetch,
          javaRuntimeManifestUrl: runtimeManifestUrl,
          manifestCacheTtlMs: 0,
        },
      );

      expect(plan.java.runtimeVersion).toBe("17.0.2");
      expect(plan.java.executable).toContain("17.0.2");
    } finally {
      updateSetting({
        key: "launcher.javaManagement",
        value: "auto",
      });
    }
  });

  test("does not fetch artifacts whose paths leave launcher storage", async () => {
    const { downloadArtifacts } = await import("../src/bun/launcher/download");
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    let fetchCalled = false;
    const plan = createTestLaunchPlan(directories, {
      missingArtifacts: [
        {
          id: "evil",
          kind: "library",
          path: join(dataRoot, "..", "evil.jar"),
          url: "https://example.com/evil.jar",
        },
      ],
    });

    const result = await downloadArtifacts(plan, {
      fetcher: async () => {
        fetchCalled = true;
        return new Response("evil");
      },
    });

    expect(fetchCalled).toBe(false);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.error).toContain("inside launcher storage");
  });

  test("downloads artifacts with bounded concurrency", async () => {
    const { downloadArtifacts } = await import("../src/bun/launcher/download");
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    let active = 0;
    let maxActive = 0;
    const plan = createTestLaunchPlan(directories, {
      missingArtifacts: Array.from({ length: 4 }, (_, index) => ({
        id: `artifact-${index}`,
        kind: "library",
        path: join(directories.libraries, "test", `artifact-${index}.jar`),
        url: `https://example.com/artifact-${index}.jar`,
      })),
    });

    const result = await downloadArtifacts(plan, {
      concurrency: 2,
      fetcher: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await wait(10);
        active -= 1;

        return new Response("artifact");
      },
    });

    expect(result).toEqual({ failed: [], succeeded: 4 });
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  test("marks downloaded managed Java executables as runnable", async () => {
    const { existsSync, statSync } = await import("node:fs");
    const { downloadArtifacts } = await import("../src/bun/launcher/download");
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    const executablePath = join(
      directories.runtimes,
      "test-runtime",
      runtimeExecutablePath,
    );
    const plan = createTestLaunchPlan(directories, {
      missingArtifacts: [
        {
          executable: true,
          id: "java-runtime-gamma:17.0.1:bin/java",
          kind: "javaRuntime",
          path: executablePath,
          url: "https://runtime.test/java-runtime-gamma/bin/java",
        },
      ],
    });

    const result = await downloadArtifacts(plan, {
      fetcher: async () => new Response("java-binary"),
    });

    expect(result).toEqual({ failed: [], succeeded: 1 });
    expect(existsSync(executablePath)).toBe(true);

    if (process.platform !== "win32") {
      expect(statSync(executablePath).mode & 0o111).not.toBe(0);
    }
  });

  test("recognizes native library entries for Windows, macOS, and Linux", async () => {
    const { isNativeLibraryZipEntry } = await import(
      "../src/bun/launcher/download"
    );

    expect(isNativeLibraryZipEntry("org/lwjgl/lwjgl.dll", "win32")).toBe(true);
    expect(isNativeLibraryZipEntry("org/lwjgl/lwjgl.dylib", "win32")).toBe(
      false,
    );
    expect(isNativeLibraryZipEntry("liblwjgl.dylib", "darwin")).toBe(true);
    expect(isNativeLibraryZipEntry("liblwjgl.jnilib", "darwin")).toBe(true);
    expect(isNativeLibraryZipEntry("lwjgl.dll", "darwin")).toBe(false);
    expect(isNativeLibraryZipEntry("liblwjgl.so", "linux")).toBe(true);
    expect(isNativeLibraryZipEntry("liblwjgl.so.1", "linux")).toBe(true);
    expect(isNativeLibraryZipEntry("lwjgl.dll", "linux")).toBe(false);
  });

  test("extracts native libraries without platform shell tools", async () => {
    const { extractNatives } = await import("../src/bun/launcher/download");
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    const jarPath = join(
      directories.libraries,
      "org",
      "lwjgl",
      "lwjgl-native-test.jar",
    );
    const nativesDir = join(directories.temp, "natives", "zip-reader-test");
    const archive = createStoredZip({
      "META-INF/readme.txt": "skip",
      "nested/lwjgl.dll": "windows-native",
      "nested/liblwjgl.dylib": "mac-native",
      "nested/liblwjgl.jnilib": "mac-legacy-native",
      "nested/liblwjgl.so": "linux-native",
      "nested/liblwjgl.so.1": "linux-versioned-native",
    });
    const expectedFiles =
      process.platform === "win32"
        ? ["lwjgl.dll"]
        : process.platform === "darwin"
          ? ["liblwjgl.dylib", "liblwjgl.jnilib"]
          : ["liblwjgl.so", "liblwjgl.so.1"];

    mkdirSync(dirname(jarPath), { recursive: true });
    writeFileSync(jarPath, archive);

    extractNatives([jarPath], nativesDir);

    expect(readdirSync(nativesDir).sort()).toEqual(expectedFiles.sort());
  });

  test("rejects unsafe external URLs before opening them", async () => {
    const { openExternal } = await import("../src/bun/rpc/handlers/runtime");
    const { ensureLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );

    await expect(openExternal({ url: "javascript:alert(1)" })).rejects.toThrow(
      "External URL must use HTTP, HTTPS, or launcher file URLs.",
    );
    await expect(openExternal({ url: "file:///etc/passwd" })).rejects.toThrow(
      "External file URL must stay inside launcher storage.",
    );

    const directories = ensureLauncherDirectories();
    await expect(
      openExternal({
        url: pathToFileURL(join(directories.temp, "missing-folder")).toString(),
      }),
    ).rejects.toThrow(
      "External file URL must point to an existing launcher path.",
    );

    if (process.platform !== "win32") {
      const outsideRoot = mkdtempSync(join(tmpdir(), "nyxen-outside-open-"));
      const outsidePath = join(outsideRoot, "outside.txt");
      const linkedPath = join(directories.temp, "outside-link.txt");

      writeFileSync(outsidePath, "outside");
      symlinkSync(outsidePath, linkedPath);

      try {
        await expect(
          openExternal({ url: pathToFileURL(linkedPath).toString() }),
        ).rejects.toThrow(
          "External file URL must stay inside launcher storage.",
        );
      } finally {
        rmSync(outsideRoot, { force: true, recursive: true });
        rmSync(linkedPath, { force: true });
      }
    }
  });

  test("resolves launcher media file URLs for renderer images", async () => {
    const { resolveMediaUrl } = await import("../src/bun/rpc/handlers/runtime");
    const { ensureLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = ensureLauncherDirectories();
    const mediaPath = join(directories.downloads, "renderer-icon.png");
    const mediaBytes = new Uint8Array([137, 80, 78, 71]);

    writeFileSync(mediaPath, mediaBytes);

    expect(
      resolveMediaUrl({ url: "https://media.example.test/icon.png" }),
    ).toEqual({ url: "https://media.example.test/icon.png" });
    expect(
      resolveMediaUrl({ url: pathToFileURL(mediaPath).toString() }),
    ).toEqual({
      url: `data:image/png;base64,${Buffer.from(mediaBytes).toString("base64")}`,
    });
    expect(() => resolveMediaUrl({ url: "file:///etc/passwd" })).toThrow(
      "Media file URL must stay inside launcher storage.",
    );

    if (process.platform !== "win32") {
      const realDataRoot = mkdtempSync(join(dataRoot, "real-media-root-"));
      const linkedDataRoot = join(dataRoot, "linked-media-root");
      const previousDataRoot = process.env.NYXEN_DATA_DIR;

      symlinkSync(realDataRoot, linkedDataRoot, "dir");
      process.env.NYXEN_DATA_DIR = linkedDataRoot;

      try {
        const linkedDirectories = ensureLauncherDirectories();
        const linkedMediaPath = join(
          linkedDirectories.downloads,
          "renderer-linked-icon.png",
        );

        writeFileSync(linkedMediaPath, mediaBytes);

        expect(
          resolveMediaUrl({ url: pathToFileURL(linkedMediaPath).toString() }),
        ).toEqual({
          url: `data:image/png;base64,${Buffer.from(mediaBytes).toString("base64")}`,
        });
      } finally {
        if (previousDataRoot === undefined) {
          delete process.env.NYXEN_DATA_DIR;
        } else {
          process.env.NYXEN_DATA_DIR = previousDataRoot;
        }
      }
    }
  });

  test("substitutes mod loader launch variables before spawning Java", async () => {
    if (process.platform === "win32") {
      return;
    }

    const { launchMinecraft, listRunningLaunches } = await import(
      "../src/bun/launcher/executor"
    );
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    const fakeJavaDir = join(dataRoot, "fake-java");
    const fakeJavaPath = join(fakeJavaDir, "java");
    const argsPath = join(fakeJavaDir, "args.txt");
    const launchPathSeparator = ":";
    const classpath = [
      join(
        directories.libraries,
        "cpw",
        "mods",
        "bootstraplauncher",
        "2.0.2",
        "bootstraplauncher-2.0.2.jar",
      ),
      join(directories.versions, "1.20.4", "1.20.4.jar"),
    ];
    const modulePath = [
      join(
        directories.libraries,
        "cpw",
        "mods",
        "bootstraplauncher",
        "2.0.2",
        "bootstraplauncher-2.0.2.jar",
      ),
      join(
        directories.libraries,
        "cpw",
        "mods",
        "securejarhandler",
        "3.0.8",
        "securejarhandler-3.0.8.jar",
      ),
    ].join(launchPathSeparator);

    mkdirSync(fakeJavaDir, { recursive: true });
    writeFileSync(
      fakeJavaPath,
      `#!/bin/sh\nprintf '%s\\n' "$@" > '${argsPath}'\n`,
    );
    chmodSync(fakeJavaPath, 0o755);

    const plan = createTestLaunchPlan(directories, {
      arguments: {
        game: [
          "--clientId",
          clientIdPlaceholder,
          "--xuid",
          authXuidPlaceholder,
        ],
        jvm: [
          `-DlibraryDirectory=${libraryDirectoryPlaceholder}`,
          `-DignoreList=client-extra,${versionNamePlaceholder}.jar`,
          "-p",
          `${libraryDirectoryPlaceholder}/cpw/mods/bootstraplauncher/2.0.2/bootstraplauncher-2.0.2.jar${classpathSeparatorPlaceholder}${libraryDirectoryPlaceholder}/cpw/mods/securejarhandler/3.0.8/securejarhandler-3.0.8.jar`,
          "-cp",
          classpathPlaceholder,
        ],
      },
      classpath,
      java: {
        component: "java-runtime-gamma",
        detectedMajorVersion: null,
        detectedVersion: null,
        detectionError: null,
        executable: fakeJavaPath,
        management: "auto",
        majorVersion: 17,
        memoryMaxMb: 4096,
        memoryMinMb: 512,
        runtimeDirectory: null,
        runtimePlatform: null,
        runtimeVersion: null,
      },
      minecraft: {
        assetIndexId: null,
        baseVersionId: "1.20.4",
        mainClass: "cpw.mods.bootstraplauncher.BootstrapLauncher",
        versionId: "neoforge-21.1.224",
      },
    });

    mkdirSync(plan.directories.game, { recursive: true });
    launchMinecraft(plan);

    for (let attempt = 0; attempt < 50 && !existsSync(argsPath); attempt++) {
      await wait(10);
    }

    for (
      let attempt = 0;
      attempt < 50 &&
      listRunningLaunches().some(
        (launch) => launch.instanceId === plan.instance.id,
      );
      attempt++
    ) {
      await wait(10);
    }

    const args = readFileSync(argsPath, "utf8").trim().split("\n");
    const modulePathArg = args[args.indexOf("-p") + 1];
    const classpathArg = args[args.indexOf("-cp") + 1];

    expect(args).toContain(`-DlibraryDirectory=${directories.libraries}`);
    expect(args).toContain(
      "-DignoreList=client-extra,neoforge-21.1.224.jar,1.20.4.jar",
    );
    expect(modulePathArg).toBe(modulePath);
    expect(modulePathArg).not.toContain("${");
    expect(classpathArg).toBe(classpath.join(launchPathSeparator));
  });

  test("handles missing Java executables without tracking a launch", async () => {
    const { launchMinecraft, listRunningLaunches } = await import(
      "../src/bun/launcher/executor"
    );
    const { getLauncherDirectories } = await import(
      "../src/bun/launcher/paths"
    );
    const directories = getLauncherDirectories();
    const plan = createTestLaunchPlan(directories, {
      java: {
        component: "java-runtime-gamma",
        detectedMajorVersion: null,
        detectedVersion: null,
        detectionError: null,
        executable: join(dataRoot, "missing-runtime", "bin", "java"),
        management: "auto",
        majorVersion: 17,
        memoryMaxMb: 4096,
        memoryMinMb: 512,
        runtimeDirectory: null,
        runtimePlatform: null,
        runtimeVersion: null,
      },
    });

    mkdirSync(plan.directories.game, { recursive: true });

    expect(() => launchMinecraft(plan)).toThrow("Failed to start Java");
    await wait(0);
    expect(listRunningLaunches()).toEqual([]);
  });

  test("launch RPC rebuilds renderer-provided plans before launching", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { launchInstance } = await import("../src/bun/rpc/handlers");
    const { getMinecraftVersionDetails, refreshMinecraftVersionManifest } =
      await import("../src/bun/launcher/versions");

    await refreshMinecraftVersionManifest({ fetcher: fakeFetch });
    await getMinecraftVersionDetails(
      { versionId: "1.20.4" },
      {
        fetcher: fakeFetch,
      },
    );

    const instance = createLauncherInstance({
      name: "Trusted Plan",
      versionId: "1.20.4",
    });
    const plan = await createLaunchPlan(
      { instanceId: instance.id },
      { fetcher: fakeFetch },
    );

    await expect(
      launchInstance({
        plan: {
          ...plan,
          java: {
            ...plan.java,
            executable: "/bin/sh",
          },
          missingArtifacts: [],
        },
      }),
    ).rejects.toThrow("Download missing artifacts before launching Minecraft");
  });

  test("rejects launch plans for offline profiles", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { createLauncherProfile } = await import(
      "../src/bun/launcher/profiles"
    );

    const profile = createLauncherProfile({
      displayName: "OfflineDev",
      kind: "offline",
    });
    const instance = createLauncherInstance({
      name: "Offline Survival",
      profileId: profile.id,
      versionId: "1.20.4",
    });

    await expect(
      createLaunchPlan(
        {
          instanceId: instance.id,
        },
        {
          fetcher: fakeFetch,
        },
      ),
    ).rejects.toThrow("not backed by a Microsoft account");
  });

  test("rejects launch plans for unverified Microsoft profiles", async () => {
    const { createLauncherInstance } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { createLauncherProfile } = await import(
      "../src/bun/launcher/profiles"
    );

    const profile = createLauncherProfile({
      displayName: "UnverifiedDev",
      kind: "microsoft",
    });
    const instance = createLauncherInstance({
      name: "Unverified Survival",
      profileId: profile.id,
      versionId: "1.20.4",
    });

    await expect(
      createLaunchPlan(
        {
          instanceId: instance.id,
        },
        {
          fetcher: fakeFetch,
        },
      ),
    ).rejects.toThrow("not backed by a Microsoft account");
  });
});
