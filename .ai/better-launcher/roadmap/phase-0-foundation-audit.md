# Phase 0 Foundation Audit

Research date: 2026-05-11
Implementation baseline: current working tree as of this audit.

## Goal

Make current launch behavior, install paths, and metadata drift visible enough to
extend Nyxen toward recipe-backed instances without guessing.

## Current Launch Preflight Fields

The launch preflight contract is `LaunchPlan` in `src/shared/types.ts`. It is
created by `createLaunchPlan` in `src/bun/launcher/launch-plan.ts` and exposed
through the `createLaunchPlan` RPC.

Current fields:

- `instance`: full launcher instance metadata from the SQLite
  `launcher_instances` row plus generated folder paths.
- `profile`: selected or first verified Microsoft profile after launch auth
  refresh. Offline profiles, unlinked profiles, and profiles without Minecraft
  ownership are rejected before a plan is returned.
- `java`: selected executable, management mode, required Java component and
  major version, memory bounds, and managed runtime install metadata.
- `minecraft`: base version id, effective launch version id, asset index id,
  and main class after loader metadata is merged.
- `modLoader`: loader kind, loader version, Minecraft version, installer path,
  and installer URL.
- `directories`: global launcher roots plus instance game, mods, saves, logs,
  config, screenshots, resource packs, shader packs, metadata, cache, and
  natives paths.
- `arguments`: resolved game and JVM arguments with instance overrides.
- `classpath`: libraries plus client jar paths used by the executor.
- `nativeArtifactPaths`: native library jars to extract.
- `missingArtifacts`: client jar, asset index, asset objects, libraries,
  native libraries, mod loader installers, and managed Java runtime files that
  need download before launch.
- `warnings`: non-fatal issues such as missing artifacts, legacy versions,
  missing main class, or ignored instance Java overrides under app-controlled
  Java management.

Recipe relevance:

- `instance`, `minecraft`, `modLoader`, and `java` form the runtime recipe.
- `missingArtifacts` forms the provider/artifact acquisition plan but not yet a
  durable file manifest.
- `directories` identifies where recipe verification must scan.
- `warnings` can seed later repair classifications, but they are not yet typed.

## Ownership-Gated Launch Planning

Launch planning currently requires a verified Microsoft profile:

- `createLaunchPlan` resolves a requested, instance-linked, or first verified
  Microsoft profile.
- `ensureMicrosoftProfileLaunchAuth` rejects missing profiles, offline profiles,
  unlinked Microsoft profiles, and Microsoft profiles without
  `game_minecraft` plus `product_minecraft`.
- If a verified Microsoft access token is expired, the launcher refreshes it
  before returning the plan.
- `launchInstance` rebuilds renderer-provided plans server-side before launching
  so renderer edits cannot bypass missing-artifact or account checks.

Test coverage:

- `persists version metadata, profiles, instances, and launch plans` covers the
  successful verified-profile path.
- `rejects launch plans for offline profiles` covers offline profile rejection.
- `rejects launch plans for unverified Microsoft profiles` covers a Microsoft
  profile row that is not ownership verified.
- `launch RPC rebuilds renderer-provided plans before launching` covers
  server-side plan rebuilding before process execution.

## Current Modpack Install Paths

### CurseForge Modpacks

Install entry point:

- `downloadCurseForgeFile` in `src/bun/launcher/instance-content.ts` downloads
  the selected file and routes `category: "modpacks"` to
  `installCurseForgeModpackData`.

Disk layout:

- Archive copy: `.nyxen/cache/modpacks/<fileName>`.
- Manifest copy: `.nyxen/metadata/curseforge-modpack-manifest.json`.
- Overrides: extracted into the instance `.minecraft` folder using the
  manifest `overrides` prefix.
- Dependency files: installed through the normal CurseForge file path for each
  required dependency. Mods land in `.minecraft/mods`; resource packs, shaders,
  and worlds land in their matching game folders.
- Provider install metadata:
  `.nyxen/metadata/curseforge-content.json`.
- Instance modpack link: serialized into `launcher_instances.modpack_metadata`
  and mirrored in `.nyxen/metadata/instance.json`.

Recipe draft mapping:

- `projectId`, `fileId`, `fileName`, `version`, `slug`, `websiteUrl`, and
  `source` come from `LauncherInstanceModpack`.
- Required dependency project/file ids come from the copied CurseForge
  manifest.
- Installed dependency records come from `curseforge-content.json`.
- File hashes are not guaranteed by the current CurseForge install metadata and
  need a later verification pass.

### Modrinth Modpacks

Install entry point:

- `downloadModrinthFile` in `src/bun/launcher/instance-content.ts` downloads
  the selected `.mrpack` and routes `category: "modpacks"` to
  `installModrinthModpackData`.

Disk layout:

- Archive copy: `.nyxen/cache/modrinth/<fileName>`.
- Manifest copy: `.nyxen/metadata/modrinth-index.json`.
- Overrides: extracted from `overrides/` into the instance `.minecraft` folder.
- Manifest files: downloaded to their declared paths under the instance
  `.minecraft` folder after path containment checks.
- Instance modpack link: serialized into `launcher_instances.modpack_metadata`
  and mirrored in `.nyxen/metadata/instance.json`.

Recipe draft mapping:

- `projectId`, `fileId`, `fileName`, `version`, `slug`, `websiteUrl`, and
  `source` come from `LauncherInstanceModpack`.
- Managed file paths, download URLs, sha1/sha512 hashes, and sizes come from
  `modrinth-index.json`.
- The installer verifies Modrinth file hashes during download, so this is the
  strongest current starting point for recipe file verification.

## Drift Points

Current places where instance metadata and disk state can diverge:

- `launcher_instances.modpack_metadata` can claim a modpack while its copied
  archive, manifest, or overrides no longer exist.
- `.nyxen/metadata/instance.json` is a mirror written from the database, not the
  source of truth. Editing it does not update SQLite.
- CurseForge dependency metadata can be incomplete when a dependency download
  is blocked, unavailable, or skipped.
- Modrinth and CurseForge mod files can be manually added, removed, renamed,
  disabled, or replaced after install.
- Overrides and configs are copied into mutable game folders and are not
  distinguished from user edits.
- Resource packs, shader packs, worlds, screenshots, and logs are listed by
  scans but are not tied to a durable recipe revision.
- The launch plan reports missing runtime artifacts but does not persist a
  successful plan as an audit record.
- Provider project/file metadata can change upstream after install, while local
  instance metadata remains pinned to the install-time file ids.
- `updateLauncherInstance` can change version or loader after compatibility
  confirmation without rewriting any modpack recipe metadata.

## Recipe Revision Schema Draft

Use one durable revision record per install, update, import, or manual snapshot.
The first implementation can persist this as JSON beside instance metadata, then
move to SQLite once migration structure is ready.

```ts
type InstanceRecipeRevision = {
  createdAt: string;
  id: string;
  instanceId: string;
  previousRevisionId: string | null;
  schemaVersion: 1;
  source:
    | { kind: "manual" }
    | {
        fileId: string;
        fileName: string;
        kind: "curseforge";
        projectId: string;
        slug?: string;
        version?: string;
        websiteUrl?: string | null;
      }
    | {
        fileId: string;
        fileName: string;
        kind: "modrinth";
        projectId: string;
        slug?: string;
        version?: string;
        websiteUrl?: string | null;
      };
  runtime: {
    javaComponent: string | null;
    javaMajorVersion: number | null;
    loader: "fabric" | "forge" | "neoforge" | "quilt" | "vanilla";
    loaderVersion: string | null;
    minecraftVersionId: string;
  };
  files: Array<{
    downloadUrls: Array<string>;
    hashes: {
      sha1?: string;
      sha512?: string;
    };
    optional: boolean;
    path: string;
    policy: "managed" | "local-only" | "mutable-config" | "generated";
    providerFileId?: string;
    providerProjectId?: string;
    sizeBytes: number | null;
    source: "curseforge" | "modrinth" | "local" | "generated";
  }>;
  overrides: Array<{
    hashes: {
      sha1?: string;
      sha512?: string;
    };
    path: string;
    policy: "mutable-config" | "local-only" | "managed";
    sizeBytes: number | null;
  }>;
};
```

Minimum rules for Phase 1:

- Paths are relative to the instance `.minecraft` folder and must pass the same
  containment checks used during install.
- Provider files should include hashes when available; files without hashes are
  allowed but must be marked weakly verified.
- Overrides default to `mutable-config` so updates can preserve user edits.
- Local/manual files default to `local-only` and should not be exported unless a
  later bundle format explicitly includes them.
- A revision should record skipped provider files separately or mark them
  optional so the UI can explain incomplete installs.

## Phase 0 Exit Criteria Status

- Launch plan can explain account, version, libraries, assets, and missing
  artifacts: implemented by `LaunchPlan` and `LaunchPlanSheet`.
- Ownership-gated launch planning has explicit tests: covered for verified,
  offline, unverified Microsoft, and renderer-provided plan paths.
- Current Modrinth and CurseForge install paths can be mapped to a recipe draft:
  documented above.
- Metadata and file drift points are identified: documented above.
- Recipe revision schema is defined: draft schema above, ready for Phase 1
  implementation.
