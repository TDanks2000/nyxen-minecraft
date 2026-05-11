# Product Plan

Research date: 2026-05-11

## Product Thesis

Nyxen should be the launcher for players who want modded Minecraft to be easy
without surrendering local control, ownership verification, or explainability.

Prism proves that a launcher can be trusted, fast, local, and powerful.
GDLauncher Carbon proves that modern players value automation, sharing, and
integrated servers. Nyxen should combine those values and add a diagnostics layer
that neither competitor treats as the main product.

## Non-Negotiables

- Require real Microsoft/Minecraft ownership before playable profile creation.
- Keep the core launcher usable without a Nyxen-hosted account service.
- Store user data locally by default.
- Never make destructive changes without a visible plan, backup, or rollback
  strategy.
- Redact tokens, account identifiers, and local secrets from logs and support
  bundles by default.
- Keep provider terms explicit, especially for CurseForge and Microsoft APIs.

## Product Pillars

### 1. Guided Power

Every advanced operation should have a simple path and an inspectable plan.

Examples:

- "Install modpack" shows source, version, loader, Java runtime, files, disk
  impact, and fallback behavior.
- "Update modpack" shows additions, removals, config conflicts, saves risk, and
  rollback point.
- "Launch" shows whether assets, libraries, natives, Java, auth, and ownership
  are ready.

### 2. Reproducible Instances

An instance should be more than a folder. It should have a recipe:

- Minecraft version.
- Loader and loader version.
- Java runtime requirement and selected runtime.
- Mods, resource packs, shader packs, datapacks, and hashes.
- Config policy: local-only, shared, mergeable, or reset-on-update.
- Source metadata: Modrinth, CurseForge, direct URL, local file, or generated.
- Last successful launch environment.

### 3. Diagnostics First

Treat troubleshooting as a first-class workflow.

Core ideas:

- Structured launch plan with each step status.
- Log parser with known crash signatures.
- Dependency graph for mods and loaders.
- Redacted support bundle export.
- "Repair" actions for missing assets, wrong Java, blocked downloads, bad
  natives, corrupt libraries, and incompatible mods.

### 4. Collaboration Without Lock-In

Instance sharing should not require all users to trust a hosted Nyxen cloud.

Preferred model:

- Share a small signed recipe file or code.
- Optionally include a portable bundle for private configs/resource files.
- Resolve public mods from providers at import time.
- Warn when provider files cannot be redistributed.
- Allow a future optional encrypted sync account, but do not require it for core
  launcher use.

### 5. Client And Server Together

Modded players often need a server immediately after creating a pack. Treat
servers as paired profiles:

- Create server from an instance recipe.
- Detect client-only and server-only mods.
- Keep worlds, backups, ops, whitelist, bans, and server properties visible.
- Show live console, CPU, memory, disk, player list, and crash state.
- Provide export/deploy later, but local server management first.

## Better-Than Targets

To be meaningfully better than Prism and GDLauncher Carbon, Nyxen should aim to
win these user-visible moments:

- First modpack install completes with no Java setup and a clear launch-ready
  state.
- Failed launch gives a classified reason and a suggested repair, not just a log.
- Modpack update can be previewed, backed up, applied, and rolled back.
- Sharing an instance with a friend preserves compatibility without hiding file
  licensing constraints.
- Server setup starts from the same instance recipe instead of asking users to
  rebuild the pack manually.
- Power users can inspect all metadata and files, while new users can stay in a
  guided flow.

