# GDLauncher Carbon Research

Research date: 2026-05-11

## Current Position

GDLauncher Carbon is the modern rewritten version of GDLauncher. The official
site presents it as an all-in-one modded Minecraft launcher focused on one-click
modpack installs, CurseForge and Modrinth browsing, Java management, dependency
handling, updates, instance sharing, and server management.

The old GDLauncher is still downloadable but no longer maintained. The Carbon
rewrite is built with Electron and SolidJS for the UI, with heavy work handled by
a Rust core module.

## Notable Features

- CurseForge and Modrinth browsing from one launcher.
- One-click modpack install with dependency handling and parallel downloads.
- Mod and modpack installs for Forge, Fabric, NeoForge, and Quilt.
- Automatic Java management.
- Built-in launcher auto-updater.
- Multi-account support.
- "Potato PC Mode" for low-end machines.
- Instance groups, duplication, and import from other launchers.
- Instance sharing using a code.
- Integrated server management:
  - Vanilla, Forge, Fabric, NeoForge, and Quilt server setup.
  - Live console.
  - CPU and memory monitoring.
  - Whitelist, ops, and bans.
  - Server mod installs from CurseForge and Modrinth.
- Modpack updater with version changes and a generated changelog.
- Import/export across launchers is described as work in progress in docs.

## Recent Signals

- GDLauncher Carbon was announced as officially released on 2024-03-01.
- The docs say Carbon reached and surpassed feature parity with the old version
  and is now being polished with new features.
- GitHub showed about 211 stars, 32 forks, 92 open issues, and 2 open pull
  requests for `gorilla-devs/GDLauncher-Carbon` at research time.
- The Carbon repository README still says the app is alpha and Discord-only for
  downloads, while the official website and blog say Carbon is released and
  downloadable. Treat the website/blog as the product signal and the README as
  stale or conservative project documentation.
- The Carbon repository is Business Source License 1.1, not GPL like Prism.

## Strengths To Preserve Or Match

- Strong first-run and modded-player pitch: users can understand the value fast.
- Modern UI and user-friendly workflow language.
- Java management is framed as automatic, not as setup homework.
- Instance sharing is a product feature, not an export workaround.
- Server management is integrated into the launcher.
- Parallel downloads and dependency handling are part of the value proposition.
- Modpack updates include version changes and generated changelogs.

## Weaknesses And Opportunity Areas

- Electron shell means higher baseline resource usage than Prism-style Qt.
- BSL licensing and trademark restrictions reduce forkability and community trust
  compared with Prism.
- The public repository documentation appears partly stale relative to the
  official site.
- Import/export is still described as work in progress in docs.
- Strong automation can hide what changed unless the UI exposes plans, diffs,
  backups, and rollback.
- Server management is valuable, but it must be paired with strong permission,
  backup, and recovery behavior.
- Cloud saves are marketed as coming soon, so reliable local backup remains a
  near-term opportunity.

## Implications For Nyxen

Nyxen should learn from GDLauncher Carbon's product instincts without copying its
tradeoffs blindly:

- Make Java, loader, dependency, and update management automatic by default.
- Always show an inspectable plan before destructive changes.
- Add sharing as a reproducible recipe, not just a zip or private cloud blob.
- Build server workflows around local-first ownership, backups, and diagnostics.
- Keep the launcher transparent, lightweight, and reviewable.
- Do not hide broken states behind "simple" UX; explain what failed and provide
  repair actions.

## Sources

- GDLauncher home/features: https://gdlauncher.com/
- GDLauncher docs: https://gdlauncher.com/docs/
- GDLauncher Carbon comparison docs: https://gdlauncher.com/docs/gdlauncher-vs-gdlauncher-carbon/
- GDLauncher troubleshooting/data paths: https://gdlauncher.com/docs/troubleshooting/
- GDLauncher Carbon release blog: https://gdlauncher.com/blog/gdlauncher-carbon-out-now/
- GDLauncher Carbon GitHub repository: https://github.com/gorilla-devs/GDLauncher-Carbon
- Legacy GDLauncher GitHub releases: https://github.com/gorilla-devs/GDLauncher/releases

