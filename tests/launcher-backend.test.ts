import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { LauncherDirectories, LaunchPlan } from "../src/shared/types";

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

const createStoredZip = (entries: Record<string, string>): Uint8Array => {
  const localParts: Array<Buffer> = [];
  const centralParts: Array<Buffer> = [];
  let offset = 0;

  for (const [name, content] of Object.entries(entries)) {
    const nameBuffer = Buffer.from(name, "utf8");
    const contentBuffer = Buffer.from(content, "utf8");
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
      name: "Test Instance",
      profileId: null,
      updatedAt: "2024-01-04T00:00:00.000Z",
      versionId: "1.20.4",
    },
    java: {
      component: "java-runtime-gamma",
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

  afterAll(() => {
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
    const plan = await createLaunchPlan({
      instanceId: instance.id,
    });
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
  });

  test("rejects Microsoft profiles when the account does not own Minecraft", async () => {
    const { completeMicrosoftProfileLogin } = await import(
      "../src/bun/launcher/microsoft-auth"
    );

    const pending = await completeMicrosoftProfileLogin(
      {
        deviceCode: "device-code",
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
            deviceCode: "device-code",
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
      expect(plan.java.executable).toContain(runtimeExecutablePath);
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
    const plan = await createLaunchPlan({ instanceId: instance.id });

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
      createLaunchPlan({
        instanceId: instance.id,
      }),
    ).rejects.toThrow("not backed by a Microsoft account");
  });
});
