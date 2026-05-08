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

const jsonResponse = (document: unknown): Response =>
  new Response(JSON.stringify(document), {
    headers: {
      "content-type": "application/json",
    },
  });

const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
  const url = input instanceof Request ? input.url : input.toString();

  if (url.endsWith("version_manifest_v2.json")) {
    return jsonResponse(manifestDocument);
  }

  if (url.endsWith("/1.20.4.json")) {
    return jsonResponse(versionDetailsDocument);
  }

  return new Response("not found", {
    status: 404,
    statusText: "Not Found",
  });
};

describe("launcher backend", () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "nyxen-launcher-"));

  beforeAll(() => {
    process.env.NYXEN_DATA_DIR = dataRoot;
  });

  afterAll(() => {
    delete process.env.NYXEN_DATA_DIR;
    rmSync(dataRoot, { force: true, recursive: true });
  });

  test("persists version metadata, profiles, instances, and launch plans", async () => {
    const { createLauncherInstance, listLauncherInstances } = await import(
      "../src/bun/launcher/instances"
    );
    const { createLaunchPlan } = await import(
      "../src/bun/launcher/launch-plan"
    );
    const { createLauncherProfile, listLauncherProfiles } = await import(
      "../src/bun/launcher/profiles"
    );
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

    const profile = createLauncherProfile({
      displayName: "NyxenDev",
      kind: "offline",
    });
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
});
