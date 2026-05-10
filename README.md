# Nyxen Minecraft

Nyxen Minecraft is a desktop launcher for Minecraft: Java Edition. The goal is
to provide a clean local launcher for managing Java Edition instances while
requiring every playable profile to be backed by a real Microsoft account that
owns Minecraft.

This project is not affiliated with, endorsed by, or sponsored by Microsoft,
Mojang Studios, Xbox, or Minecraft. Minecraft is a trademark of Microsoft
Corporation.

## App Review Summary

This repository is intended to be reviewable as the public project page for the
Nyxen Minecraft app registration.

- App name: `Nyxen Minecraft`
- App type: desktop launcher for Minecraft: Java Edition
- Platform: local desktop app built with Electrobun, Bun, React, and SQLite
- Authentication type: Microsoft device-code flow for personal Microsoft
  accounts
- Requested Microsoft scope: `XboxLive.signin offline_access`
- Minecraft Services purpose: exchange the Xbox token for a Minecraft access
  token, read the signed-in account's Minecraft profile, and verify Java Edition
  ownership before creating a playable profile
- Anti-piracy behavior: launch planning rejects offline, unlinked, or
  unverified profiles
- Data sharing: no hosted backend and no telemetry service are implemented in
  this repository

Nyxen Minecraft needs Minecraft Services API access because it must call
`https://api.minecraftservices.com/authentication/login_with_xbox` and
`https://api.minecraftservices.com/entitlements/mcstore` after Microsoft/Xbox
sign-in. Without that access, the launcher cannot legally verify that a user owns
Minecraft: Java Edition.

## Brand And Purpose

Nyxen is a focused desktop launcher brand. The app is designed around three
principles:

- Verified access: only Microsoft accounts with Minecraft ownership should be
  usable for launch profiles.
- Local control: launcher profiles, settings, version metadata, and instances
  live on the user's machine.
- Clear setup: authentication failures should explain whether the problem is the
  Azure app registration, Microsoft sign-in, Xbox authorization, Minecraft
  Services approval, or ownership status.

The launcher currently focuses on account verification, local instance
management, version metadata caching, and launch preflight planning. It is still
in early development and does not claim to replace the official Minecraft
Launcher.

## What The App Does

- Starts Microsoft device-code sign-in for a personal Microsoft account.
- Detects when Microsoft sign-in has completed.
- Exchanges the Microsoft token through Xbox Live and XSTS.
- Requests a Minecraft access token from Minecraft Services.
- Checks Minecraft entitlements for `product_minecraft` and `game_minecraft`.
- Stores a verified launcher profile only after ownership succeeds.
- Blocks launch plans for offline, unlinked, or unverified profiles.
- Manages local launcher instances and Minecraft version metadata.
- Reports missing launch artifacts before a future launch/download step.

## What The App Does Not Do

- It does not ask users for Microsoft passwords.
- It does not use or ship a client secret.
- It does not create offline playable accounts.
- It does not bypass Minecraft ownership checks.
- It does not include a hosted account service.
- It does not upload tokens, profiles, or telemetry to a Nyxen server.

## Authentication Flow

1. The user clicks `Sign In` in the Profiles screen.
2. Nyxen requests a Microsoft device code using the configured Azure
   Application (client) ID.
3. The user signs in at Microsoft's verification page.
4. Nyxen shows an on-screen signed-in state after Microsoft accepts the device
   code.
5. The `Verify Ownership` button becomes available.
6. Nyxen exchanges the Microsoft token through Xbox Live and XSTS.
7. Nyxen calls Minecraft Services to get a Minecraft access token.
8. Nyxen checks Minecraft ownership entitlements.
9. If ownership is valid, Nyxen saves the Minecraft profile locally.

The app uses short RPC calls and background ownership verification so slow
Minecraft/Xbox network calls do not block the UI.

## Privacy And Local Data

Launcher state is stored locally under the app-scoped OS data directory by
default, such as `~/.local/share/dev.electrobun.nyxenminecraft/dev` on Linux.
Set `NYXEN_DATA_DIR` to isolate SQLite and launcher cache files during tests or
manual debugging.

The local SQLite database stores launcher profiles, instances, cached version
metadata, and tokens needed to refresh a verified Microsoft profile. This is
desktop-local state for the launcher. The repository does not implement a remote
Nyxen API, analytics endpoint, or account sync service.

## Features

- Microsoft account profile creation with Minecraft ownership verification
- Verified profile list and ownership status UI
- Persistent local Minecraft instances
- Minecraft Java version manifest refresh and caching
- Version detail caching for launch metadata
- Launch preflight plans with missing artifact reporting
- Optional CurseForge catalog search using a local API key
- Local launcher directory and settings status
- Typed Electrobun RPC between Bun and the React webview

## Tech Stack

- Electrobun
- Bun
- React + Vite
- TanStack Router
- Tailwind CSS
- shadcn-style component sources
- SQLite
- Drizzle ORM
- TypeScript
- Biome
- Bun test

## Development

Install dependencies:

```bash
bun install
```

Start the desktop app in development:

```bash
bun run dev
```

Build the app:

```bash
bun run build
```

Run checks:

```bash
bun run typecheck
bun test
bun run lint
```

Common scripts:

```bash
bun run format
bun run check
bun run db:generate
bun run db:studio
```

## Microsoft Auth Setup

The launcher signs users in with Microsoft's device-code flow, then checks the
Minecraft Services entitlements for that signed-in account. It needs a Microsoft
Entra app registration client id, but it does not need a client secret.

To create the client id:

1. Go to the Microsoft Entra admin center or Azure portal.
2. Open `Microsoft Entra ID`.
3. Open `App registrations`.
4. Select `New registration`.
5. Set `Name` to something recognizable, such as `Nyxen Minecraft Launcher`.
6. Under `Supported account types`, select `Personal Microsoft accounts only`.
   Minecraft Java accounts are consumer Microsoft/Xbox accounts, and the
   launcher uses the `/consumers` Microsoft identity authority.
7. Leave `Redirect URI` empty. The launcher uses device-code sign-in, so there
   is no browser callback URL to register.
8. Select `Register`.
9. Open `Authentication`.
10. Under `Advanced settings`, set `Allow public client flows` to `Yes`, then
    select `Save`. If your portal shows platform cards instead, add a
    `Mobile and desktop applications` platform. The device-code flow requires
    the app to be a public/mobile client.
11. On the app registration `Overview` page, copy `Application (client) ID`.
    Do not copy `Object ID` or `Directory (tenant) ID`.
12. Add it to `.env` before starting the app:

```dotenv
NYXEN_MICROSOFT_CLIENT_ID=paste-application-client-id-here
```

Then start the app with `bun run dev`. Keep using only the client id for this
desktop app; do not create or ship a client secret.

## CurseForge Catalog Setup

Nyxen can refresh the Modpacks catalog from CurseForge when a local API key is
configured. The key stays on the user's machine and is sent only from the Bun
backend to the CurseForge API.

Set the key in `.env`:

```dotenv
NYXEN_CURSEFORGE_API_KEY=paste-curseforge-api-key-here
```

CurseForge keys often contain `$`. Bun expands `$` references in `.env` files,
so escape each dollar sign as `\$` when pasting the key.

Then start the app:

```bash
bun run dev
```

## Minecraft Services App Registration

If Minecraft Services returns:

```text
Minecraft authentication failed: Invalid app registration, see https://aka.ms/AppRegInfo for more information
```

Microsoft sign-in and Xbox auth worked, but Minecraft Services rejected the
Azure application id. New Azure app registrations need Minecraft Services API
approval before `api.minecraftservices.com/authentication/login_with_xbox` will
issue Minecraft access tokens.

Open `https://aka.ms/AppRegInfo` and submit the app registration details. The
form asks for values from the Azure app registration `Overview` page:

- `Application (client) ID`
- `Directory (tenant) ID`
- App name and contact details

After Minecraft/Microsoft approves the app id, keep the same
`NYXEN_MICROSOFT_CLIENT_ID` and try sign-in again.

## Troubleshooting

### Azure Says Apps Are Not Contained Within Any Directory

Personal Microsoft accounts can still sign in to the launcher, but Microsoft no
longer lets new app registrations live only under a personal account. If the
portal shows a message like `These applications are associated with the account
... but are not contained within any directory`, create or join an Entra
directory first, then create a new app registration inside that directory.

The practical path is:

1. Sign up for Azure with the same Microsoft account, or join the Microsoft 365
   Developer Program if you qualify.
2. After the directory exists, return to the Azure portal or Microsoft Entra
   admin center.
3. Use the directory switcher in the top bar and select the new directory.
4. Go back to `Microsoft Entra ID` -> `App registrations` -> `New registration`.
5. Create the app registration using the steps above, then copy the new
   `Application (client) ID`.

Older personal-account-only app registrations may still be visible for
management, but Microsoft does not provide a direct move/transfer path into a
directory. For this launcher, create a new app registration in the directory and
use that new client id.

### Microsoft Says The Client Application Must Be Marked As Mobile

`AADSTS70002: The provided client is not supported for this feature. The client
application must be marked as 'mobile.'` means the app registration is still
configured as a confidential/web client. Fix the app registration, not the
launcher code:

1. Open the app registration in Microsoft Entra.
2. Open `Authentication`.
3. Set `Allow public client flows` to `Yes` under `Advanced settings`.
4. Select `Save`.
5. Try Microsoft sign-in in the launcher again.

Do not add a client secret for this launcher. Desktop/device-code sign-in is a
public client flow, and secrets cannot be safely kept in a shipped desktop app.

### Microsoft Sign-In Times Out

The launcher gives each Microsoft/Xbox/Minecraft network call 15 seconds by
default and runs ownership verification through short polling calls. If you
still see a timeout, check that the machine can reach:

- `https://login.microsoftonline.com`
- `https://user.auth.xboxlive.com`
- `https://xsts.auth.xboxlive.com`
- `https://api.minecraftservices.com`

You can raise the per-request network timeout while debugging:

```bash
export NYXEN_AUTH_REQUEST_TIMEOUT_MS=30000
bun run dev
```

## Repository Structure

```text
src/bun/launcher/                  Launcher backend logic
src/bun/launcher/microsoft-auth.ts Microsoft, Xbox, and Minecraft auth flow
src/bun/db/                        SQLite and Drizzle schema
src/bun/rpc/                       Electrobun RPC handlers and router
src/views/main/                    React desktop UI
src/shared/                        Shared RPC and app types
tests/                             Bun test coverage
```
