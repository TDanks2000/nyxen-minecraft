# Nyxen Minecraft

Generated with `create-electrobun-stack`.

## Commands

```bash
bun install
bun run dev
bun run build
bun test
bun run typecheck
bun run lint
bun run format
bun run check
```

## Stack

- Electrobun
- Bun
- React + Vite
- TanStack Router
- Tailwind CSS
- Typed Electrobun RPC
- Electrobun app menu disabled
- Local-only navigation guard
- Hidden inset titlebar
- bun package manager metadata
- Strict TypeScript
- Biome
- Bun test
- Turborepo task runner
- SQLite
- Drizzle ORM
- VS Code-style JSON settings store

`ces.json` records the generated stack, reproducible command, and feature flags for future `create-electrobun-stack` commands.

## RPC Example

Shared RPC types live in `src/shared/rpc/schema.ts`.

The Bun main process registers handlers in `src/bun/rpc/router.ts`.

The renderer creates the WebView RPC client in `src/views/main/lib/rpc.ts`.

## Launcher Backend

The first launcher backend slice is in `src/bun/launcher` and exposes typed
Electrobun RPC calls for:

- Launcher directory/status discovery
- Minecraft Java version manifest refresh and caching
- Version detail caching for launch metadata
- Local launcher profiles
- Persistent Minecraft instances
- Launch preflight plans that report missing client, asset, and library artifacts

Launcher state is stored under `data/` by default. Tests set `NYXEN_DATA_DIR` to
isolate SQLite and launcher cache files.
