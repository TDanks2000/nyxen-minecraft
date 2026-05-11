# Service Design

Research date: 2026-05-11

## Core Contracts

### Catalog Provider

Purpose: normalize Modrinth, CurseForge, and future providers.

Responsibilities:

- Search projects.
- Fetch project versions/files.
- Resolve dependencies.
- Return licensing and redistribution flags when available.
- Return download method: direct, browser-required, unavailable, or manual.
- Provide hashes and metadata for verification.

### Instance Recipe Service

Purpose: make every instance reproducible.

Responsibilities:

- Create recipe from manual instance, modpack install, or import.
- Store recipe revisions.
- Compare current files to recipe.
- Export/import recipe.
- Mark private files that should not be shared.

### Snapshot Service

Purpose: protect users before updates and destructive changes.

Responsibilities:

- Snapshot mod list, configs, saves, resource packs, and recipe revision.
- Prune old snapshots by policy.
- Restore a previous snapshot.
- Report what restore will overwrite.

### Java Selector

Purpose: remove Java setup pain.

Responsibilities:

- Detect installed runtimes.
- Download supported Mojang/OpenJDK runtimes when permitted.
- Select runtime by Minecraft version, loader constraints, CPU architecture,
  OS, and user override.
- Explain selection in UI.

### Launch Planner

Purpose: produce an inspectable launch plan before running the game.

Responsibilities:

- Validate account and ownership state.
- Validate version metadata, libraries, assets, natives, loader, Java, and mods.
- Emit missing artifacts.
- Emit warnings for RAM, Java mismatch, incompatible mods, and provider issues.
- Persist plan summary for diagnostics.

### Repair Classifier

Purpose: turn failures into understandable actions.

Inputs:

- Launch plan result.
- Download result.
- Game logs.
- Launcher logs.
- Exit code.
- Environment snapshot.

Outputs:

- Category.
- Confidence.
- Evidence.
- Suggested repair action.
- Safe-to-automate flag.

### Server Profile Service

Purpose: manage local servers from instance recipes.

Responsibilities:

- Create server profile from a client recipe.
- Resolve server installer and libraries.
- Detect client-only mods.
- Manage server runtime, process, logs, backups, ops, whitelist, bans, and
  server properties.

## RPC Shape

Prefer request/response RPC for short operations and event streams for long
operations.

Examples:

- `launcher.planLaunch(instanceId, profileId)`
- `launcher.startLaunch(planId)`
- `instances.createFromRecipe(recipe)`
- `instances.previewUpdate(instanceId, targetVersionId)`
- `instances.applyUpdate(updatePlanId)`
- `repair.classifyLaunchFailure(launchAttemptId)`
- `repair.applyAction(actionId)`
- `servers.createFromInstance(instanceId)`
- `servers.start(serverId)`
- `downloads.subscribeQueue()`

## Safety Rules

- Any operation that changes saves, configs, mods, or server worlds needs a
  preview and snapshot.
- Any support export needs redaction by default.
- Any provider download needs source and hash metadata when available.
- Any auth failure must avoid logging raw tokens.
- Any process runner must capture stdout/stderr and exit code into a bounded log.

