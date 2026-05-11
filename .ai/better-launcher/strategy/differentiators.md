# Differentiators

Research date: 2026-05-11

## 1. Ownership-Verified Local Launcher

Nyxen already has a strong foundation: Microsoft device-code sign-in,
Minecraft Services ownership checks, and local verified profiles. Make that a
visible trust feature.

What to build:

- Profile health panel showing Microsoft auth, Xbox auth, Minecraft token,
  entitlement status, and refresh state.
- Clear copy for failed verification without exposing token details.
- Launch gating that explains exactly which prerequisite failed.

## 2. Launch Plan Inspector

Before the game starts, Nyxen should build a full plan and keep it inspectable.

Plan sections:

- Account and entitlement.
- Minecraft version metadata.
- Loader metadata.
- Java runtime.
- Libraries.
- Assets.
- Natives.
- Mods and resource packs.
- JVM args and game args.
- Working directory.
- Environment variables.

Why this beats competitors:

- Prism exposes power but can make users inspect scattered settings/logs.
- GDLauncher automates but can obscure exact decisions.
- Nyxen can provide both automation and an audit trail.

## 3. Repair Center

Turn common failures into direct actions.

Initial repair actions:

- Re-download missing assets.
- Re-download corrupt libraries.
- Re-extract natives.
- Switch to recommended Java.
- Re-authenticate profile.
- Refresh version manifest.
- Disable incompatible mod.
- Install missing dependency.
- Restore previous modpack snapshot.

## 4. Instance Recipes And Snapshots

Represent an instance as durable metadata plus local files.

Recipe files should be small, reviewable, and shareable. Snapshots should be
local and rollback-friendly.

Winning behavior:

- Every install/update creates a recipe revision.
- Every revision records file hashes and provider metadata.
- Saves are protected before destructive updates.
- Shared recipes do not leak private tokens or machine paths.

## 5. Server Pairing

Users should be able to create a server from a working client instance.

Core behavior:

- Detect loader and Minecraft version.
- Resolve server installer and libraries.
- Split client-only mods from server-compatible mods.
- Track `server.properties`, whitelist, ops, bans, and backups.
- Run with the correct Java runtime.
- Show live status and logs.

## 6. Provider-Aware Downloads

Provider rules matter. Nyxen should make them explicit without making users do
manual research.

Behavior:

- Mark files by source: Modrinth, CurseForge, Mojang, direct URL, local import.
- Respect opt-out and redistribution rules.
- Explain when a file needs browser/manual download.
- Cache metadata separately from binaries.
- Verify hashes after download.

## 7. Low-End Mode

Prism has the lightweight reputation. GDLauncher markets a low-end mode. Nyxen
should provide a concrete low-resource profile.

Possible switches:

- Disable animated artwork.
- Lower concurrent downloads.
- Reduce background refresh frequency.
- Defer screenshots and rich metadata.
- Prefer compact lists over media-heavy grids.
- Warn when instance RAM exceeds sensible limits.

