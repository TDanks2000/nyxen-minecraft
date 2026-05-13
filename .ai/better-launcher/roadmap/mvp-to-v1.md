# MVP To V1 Roadmap

Research date: 2026-05-11

## Phase 0: Foundation Audit

Goal: make current behavior visible and safe to extend.

Baseline artifact:

- `roadmap/phase-0-foundation-audit.md`

Tasks:

- Document current launch preflight fields.
- Add tests around ownership-gated launch planning.
- Inventory existing Modrinth and CurseForge install paths.
- Identify where instance metadata and file state can drift.
- Define recipe revision schema.

Exit criteria:

- A launch plan can explain account, version, libraries, assets, and missing
  artifacts.
- Current modpack install paths can be mapped to a recipe draft.

## Phase 1: Recipe-Backed Instances

Goal: every managed instance has reproducible metadata.

- Add recipe revision records.
- Convert Modrinth `.mrpack` installs into recipe revisions.
- Add file hash verification for managed files.
- Add drift detection for added, removed, and changed files.
- Expose recipe summary in instance details.

Exit criteria:

- User can see what an instance is made of.
- Nyxen can compare disk state to last known recipe.

## Phase 2: Java Manager

Goal: match or beat Prism and GDLauncher on Java setup.

- Detect installed Java runtimes.
- Select recommended Java based on Minecraft version.
- Add download/install path for supported runtimes.
- Pin runtime per instance.
- Explain Java mismatch failures in launch plan.

Exit criteria:

- A fresh user can install and launch a supported pack without manually finding
  Java.
- Wrong-Java failures become repair suggestions.

## Phase 3: Update Preview, Backup, Rollback

Goal: make modpack updates safer than competitor defaults.

- Preview update file changes.
- Snapshot configs, saves, and mod list before update.
- Generate changelog from provider metadata.
- Apply update with hash verification.
- Restore previous snapshot.

Completed:

- [x] Wire the existing CurseForge modpack update check/apply flow through the
  main-view RPC router so the instance details UI can call it.

Exit criteria:

- Updating a pack is reversible.
- The user can inspect what changed before and after.

## Phase 4: Repair Center

Goal: make failure states understandable.

- Persist launch attempts.
- Parse logs for common Java, loader, mod, graphics, auth, network, and disk
  failures.
- Add repair actions for missing files, corrupt files, wrong Java, missing mod
  dependency, stale auth, and failed native extraction.
- [x] Add redacted support bundle export.

Exit criteria:

- A failed launch produces a classified reason and next action.
- Support bundle does not include raw tokens or sensitive database files.

## Phase 5: Shareable Recipes

Goal: beat Prism's manual export and GDLauncher's code sharing with transparent
recipes.

- [x] Export recipe to a small JSON file.
- Import recipe with provider resolution.
- [x] Warn on unavailable, blocked, private, or local-only files.
- Add optional bundle format for private files.
- [x] Sign recipe with a local key or checksum manifest.

Exit criteria:

- A friend can reproduce a pack from a recipe.
- The importer can see exactly what will be downloaded or skipped.

## Phase 6: Local Server Profiles

Goal: bring GDLauncher-like server management into Nyxen's local-first model.

- Create server profile from instance recipe.
- Detect and exclude client-only mods.
- Manage server Java runtime.
- Provide live console and process controls.
- Add backups, whitelist, ops, bans, and `server.properties` editor.

Exit criteria:

- A user can create a compatible local server from a working client instance.
- Server worlds are backed up before risky changes.

## Phase 7: Polish And Performance

Goal: keep Nyxen modern without making it feel heavy.

- Add low-end mode.
- Tune download concurrency.
- Cache metadata intelligently.
- Add compact and rich instance views.
- Add provider status and offline availability indicators.
- Profile startup and common flows.

Exit criteria:

- Startup, browsing, and instance switching remain responsive on modest hardware.
- Users can understand which instances are playable offline.
