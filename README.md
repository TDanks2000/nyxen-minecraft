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
- Microsoft device-code sign-in for launcher profiles
- Minecraft ownership checks against the signed-in account before saving or using a profile

Launcher state is stored under `data/` by default. Tests set `NYXEN_DATA_DIR` to
isolate SQLite and launcher cache files.

## Microsoft Auth

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
   select `Save`. If your portal shows platform cards instead, add a `Mobile and
   desktop applications` platform. The device-code flow requires the app to be a
   public/mobile client.
11. On the app registration `Overview` page, copy `Application (client) ID`.
   Do not copy `Object ID` or `Directory (tenant) ID`.
12. Set it before starting the app:

```bash
export NYXEN_MICROSOFT_CLIENT_ID="paste-application-client-id-here"
bun run dev
```

For a persistent local setup, put the export in your shell profile or the script
you use to launch the app. Keep using only the client id for this desktop app;
do not create or ship a client secret.

### If Azure says the apps are not contained within any directory

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

### If Microsoft says the client application must be marked as mobile

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

### If Minecraft says the app registration is invalid

`Minecraft authentication failed: Invalid app registration, see
https://aka.ms/AppRegInfo for more information` means Microsoft sign-in and Xbox
auth worked, but Minecraft Services rejected the Azure application id. New Azure
app registrations need Minecraft Services API approval before
`api.minecraftservices.com/authentication/login_with_xbox` will issue Minecraft
access tokens.

Open `https://aka.ms/AppRegInfo` and submit the app registration details. The
form asks for values from the Azure app registration `Overview` page:

- `Application (client) ID`
- `Directory (tenant) ID`
- App name and contact details

After Minecraft/Microsoft approves the app id, keep the same
`NYXEN_MICROSOFT_CLIENT_ID` and try sign-in again.

### If Microsoft sign-in times out

The launcher gives each Microsoft/Xbox/Minecraft network call 15 seconds by
default and keeps the RPC request open long enough for the full ownership check.
If you still see a timeout, check that the machine can reach:

- `https://login.microsoftonline.com`
- `https://user.auth.xboxlive.com`
- `https://xsts.auth.xboxlive.com`
- `https://api.minecraftservices.com`

You can raise the per-request network timeout while debugging:

```bash
export NYXEN_AUTH_REQUEST_TIMEOUT_MS=30000
bun run dev
```
