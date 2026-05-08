import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
