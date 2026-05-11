# Benchmark Matrix

Research date: 2026-05-11

| Area | Prism Launcher | GDLauncher Carbon | Nyxen Target |
| --- | --- | --- | --- |
| Core identity | Open-source, lightweight, power-user launcher | Modern all-in-one modded launcher | Local-first, verified, guided launcher |
| Trust model | GPL-3.0, transparent source, redistributable | BSL 1.1, source available but less forkable | Transparent source, no hidden hosted dependency for core use |
| Runtime model | Qt/C++ desktop app | Electron/SolidJS UI plus Rust core | Current Electrobun/Bun/React plus carefully isolated native/core services |
| Resource usage | Strong lightweight story | Heavier Electron baseline | Keep shell lean, move heavy work off UI, expose low-end mode |
| Accounts | Multiple accounts | Multi-account support | Microsoft ownership-verified profiles only, with clear auth state |
| Instances | Mature isolated instances | Instances, groups, duplicate, imports | Instance recipes, snapshots, groups, tags, and audit trails |
| Mod sources | Modrinth, CurseForge, Technic, FTB, FTB Legacy | CurseForge and Modrinth focus | Modrinth and CurseForge first, provider interface for more sources |
| Modpack updates | Supported, active recent fixes | Version switching plus generated changelog | Update plan with file diff, dependency graph, backup, rollback |
| Mod management | Install/update individual mods | Install addons and dependencies | Smart compatibility resolver and conflict explanations |
| Java management | Auto-download in Prism 9.0+ when package supports it | Automatic Java manager | Automatic Java by default, explicit runtime pinning per instance |
| Logs | Log viewer and mclo.gs upload | App logs in runtime path | Structured diagnostics, redaction, support bundle, launch replay |
| Server management | Not first-class | First-class server setup and monitoring | First-class local server profiles paired to instances |
| Instance sharing | Not first-class | Share by code | Signed, reproducible recipe with optional file bundle |
| Cloud/sync | Not first-class | Cloud saves marketed as coming soon | Optional encrypted sync later; local backup first |
| New-user flow | Powerful but dense | Friendly and modern | Guided setup that becomes power-user capable |
| Offline posture | Strong local use once assets exist | Past issue signal around offline startup; current state not fully assessed | Offline-ready library, asset, and metadata cache with clear availability |
| Diagnostics | Useful logs, many settings | Simpler UX, docs warn about sensitive logs | Explain failure, propose repair, redact secrets by default |

## Practical Gaps To Beat

1. "I do not know which Java I need."
   - Auto-select and download the correct runtime.
   - Explain why Java 8, 17, or 21 was selected.
   - Pin runtime per instance and warn before changing it.

2. "My modpack updated and now nothing works."
   - Show planned file changes before update.
   - Snapshot configs, saves, and mod list first.
   - Generate a human-readable changelog and rollback button.

3. "My friend cannot join because their setup is different."
   - Create a signed instance recipe with Minecraft version, loader, mods,
     hashes, config policy, and optional resource files.
   - Let another user import it with compatibility warnings.

4. "The game crashed and I do not know why."
   - Parse logs into categories: Java, graphics, loader, mod conflict, missing
     dependency, auth, network, disk, or launcher bug.
   - Provide a support bundle with secrets redacted.
   - Link the exact failed launch plan and environment snapshot.

5. "I want to host the pack for friends."
   - Derive a server profile from the client instance.
   - Track server mods separately from client-only mods.
   - Provide live console, resource usage, backups, whitelist, ops, and bans.

6. "Launchers feel either powerful or friendly, not both."
   - Default to guided flows.
   - Offer an inspector mode for plans, files, metadata, and logs.
   - Keep advanced settings discoverable but not required.

