import type {
  CompleteMicrosoftProfileLoginInput,
  LauncherProfile,
  MicrosoftProfileLoginResult,
  MicrosoftProfileLoginStart,
  MicrosoftProfileSignInStatus,
} from "../../shared/types";
import {
  getLauncherProfileAuthSecrets,
  isProfileVerifiedForMinecraft,
  updateVerifiedMicrosoftProfile,
  upsertVerifiedMicrosoftProfile,
  type VerifiedMicrosoftProfileInput,
} from "./profiles";

type AuthFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type AuthOptions = {
  clientId?: string;
  fetcher?: AuthFetch;
  now?: () => Date;
  requestTimeoutMs?: number;
};

type MicrosoftAccessToken = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string | null;
};

type XboxToken = {
  token: string;
  userHash: string;
};

type MinecraftAccessToken = {
  accessToken: string;
  expiresIn: number;
};

type MinecraftAccount = VerifiedMicrosoftProfileInput;

type MicrosoftProfileLoginJob =
  | {
      createdAt: number;
      status: "running";
    }
  | {
      createdAt: number;
      error: string;
      status: "error";
    }
  | {
      createdAt: number;
      profile: LauncherProfile;
      status: "complete";
    };

type MicrosoftProfileSignInToken = {
  createdAt: number;
  token: MicrosoftAccessToken;
};

const MICROSOFT_AUTHORITY =
  "https://login.microsoftonline.com/consumers/oauth2/v2.0";
const MICROSOFT_SCOPE = "XboxLive.signin offline_access";
const XBOX_AUTH_URL = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_AUTH_URL = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MINECRAFT_LOGIN_URL =
  "https://api.minecraftservices.com/authentication/login_with_xbox";
const MINECRAFT_ENTITLEMENTS_URL =
  "https://api.minecraftservices.com/entitlements/mcstore";
const MINECRAFT_PROFILE_URL =
  "https://api.minecraftservices.com/minecraft/profile";
const DEFAULT_AUTH_REQUEST_TIMEOUT_MS = 15_000;
const LOGIN_JOB_TTL_MS = 10 * 60 * 1000;
const REQUIRED_ENTITLEMENTS = new Set(["game_minecraft", "product_minecraft"]);

const microsoftProfileLoginJobs = new Map<string, MicrosoftProfileLoginJob>();
const microsoftProfileSignInTokens = new Map<
  string,
  MicrosoftProfileSignInToken
>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown, key: string, context: string): string => {
  if (isRecord(value) && typeof value[key] === "string") {
    return value[key];
  }

  throw new Error(`${context} response did not include ${key}.`);
};

const getOptionalString = (value: unknown, key: string): string | null => {
  if (isRecord(value) && typeof value[key] === "string") {
    return value[key];
  }

  return null;
};

const getNumber = (value: unknown, key: string, context: string): number => {
  if (isRecord(value) && typeof value[key] === "number") {
    return value[key];
  }

  throw new Error(`${context} response did not include ${key}.`);
};

const parseJsonResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return { errorMessage: await response.text() };
  }

  return response.json() as Promise<unknown>;
};

const getResponseMessage = (body: unknown): string | null => {
  for (const key of ["error_description", "errorMessage", "message", "error"]) {
    const value = getOptionalString(body, key);

    if (value) {
      return value;
    }
  }

  return null;
};

const getErrorCodes = (body: unknown): Set<number> => {
  if (!isRecord(body) || !Array.isArray(body.error_codes)) {
    return new Set();
  }

  return new Set(
    body.error_codes.filter((code): code is number => typeof code === "number"),
  );
};

const isPublicClientRequiredError = (
  body: unknown,
  message: string | null,
): boolean =>
  getErrorCodes(body).has(70002) || Boolean(message?.includes("AADSTS70002"));

const isInvalidMinecraftAppRegistrationError = (
  message: string | null,
): boolean =>
  Boolean(
    message?.includes("Invalid app registration") ||
      message?.includes("aka.ms/AppRegInfo"),
  );

const formatHttpError = (
  context: string,
  response: Response,
  body: unknown,
): Error => {
  const message = getResponseMessage(body);
  const publicClientHint =
    context === "Microsoft device login" &&
    isPublicClientRequiredError(body, message)
      ? " In the Azure app registration, open Authentication and enable public client/native mobile and desktop flows before using this client id."
      : "";
  const minecraftAppRegistrationHint =
    context === "Minecraft authentication" &&
    isInvalidMinecraftAppRegistrationError(message)
      ? " Minecraft Services must approve this Azure application id before it can call the Minecraft authentication API. Open https://aka.ms/AppRegInfo and submit this app's Application (client) ID and Directory (tenant) ID, then try again after approval."
      : "";
  const hint = `${publicClientHint}${minecraftAppRegistrationHint}`;

  return new Error(
    message
      ? `${context} failed: ${message}${hint}`
      : `${context} failed with HTTP ${response.status}.${hint}`,
  );
};

const getClientId = (options: AuthOptions = {}): string => {
  const clientId =
    options.clientId?.trim() ?? process.env.NYXEN_MICROSOFT_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error(
      "Microsoft authentication is not configured. Set NYXEN_MICROSOFT_CLIENT_ID to an Azure app registration client id.",
    );
  }

  return clientId;
};

const getFetcher = (options: AuthOptions = {}): AuthFetch =>
  options.fetcher ?? fetch;

const getNow = (options: AuthOptions = {}): Date =>
  options.now?.() ?? new Date();

const getRequestTimeoutMs = (options: AuthOptions = {}): number => {
  if (options.requestTimeoutMs !== undefined) {
    return Math.max(1, Math.trunc(options.requestTimeoutMs));
  }

  const configured = Number(process.env.NYXEN_AUTH_REQUEST_TIMEOUT_MS ?? "");

  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_AUTH_REQUEST_TIMEOUT_MS;
  }

  return Math.max(1_000, Math.trunc(configured));
};

const getAbortErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error && error.name === "AbortError") {
    return error.message;
  }

  return null;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const cleanupMicrosoftProfileLoginJobs = (now: number): void => {
  for (const [deviceCode, job] of microsoftProfileLoginJobs) {
    if (now - job.createdAt > LOGIN_JOB_TTL_MS) {
      microsoftProfileLoginJobs.delete(deviceCode);
    }
  }

  for (const [deviceCode, signInToken] of microsoftProfileSignInTokens) {
    if (now - signInToken.createdAt > LOGIN_JOB_TTL_MS) {
      microsoftProfileSignInTokens.delete(deviceCode);
    }
  }
};

const withRequestTimeout = async <T>(
  context: string,
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          `${context} timed out after ${Math.round(
            timeoutMs / 1000,
          )} seconds. Check your internet connection and try again.`,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      run(controller.signal).catch((error: unknown) => {
        const abortMessage = getAbortErrorMessage(error);

        if (abortMessage) {
          throw new Error(
            `${context} timed out after ${Math.round(
              timeoutMs / 1000,
            )} seconds. Check your internet connection and try again.`,
          );
        }

        throw error;
      }),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const postForm = async (
  context: string,
  url: string,
  body: URLSearchParams,
  fetcher: AuthFetch,
  timeoutMs: number,
): Promise<Response> =>
  withRequestTimeout(context, timeoutMs, (signal) =>
    fetcher(url, {
      body,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      signal,
    }),
  );

const postJson = async (
  context: string,
  url: string,
  body: unknown,
  fetcher: AuthFetch,
  timeoutMs: number,
): Promise<Response> =>
  withRequestTimeout(context, timeoutMs, (signal) =>
    fetcher(url, {
      body: JSON.stringify(body),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-xbl-contract-version": "1",
      },
      method: "POST",
      signal,
    }),
  );

const getJson = async (
  context: string,
  url: string,
  headers: HeadersInit,
  fetcher: AuthFetch,
  timeoutMs: number,
): Promise<Response> =>
  withRequestTimeout(context, timeoutMs, (signal) =>
    fetcher(url, {
      headers,
      signal,
    }),
  );

const requestJson = async (
  context: string,
  response: Response,
): Promise<unknown> => {
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw formatHttpError(context, response, body);
  }

  return body;
};

const getUserHash = (body: unknown, context: string): string => {
  const displayClaims = isRecord(body) ? body.DisplayClaims : null;
  const xui = isRecord(displayClaims) ? displayClaims.xui : null;
  const firstClaim = Array.isArray(xui) ? xui[0] : null;

  if (isRecord(firstClaim) && typeof firstClaim.uhs === "string") {
    return firstClaim.uhs;
  }

  throw new Error(`${context} response did not include a user hash.`);
};

const getXstsErrorMessage = (body: unknown): string | null => {
  if (!isRecord(body) || typeof body.XErr !== "number") {
    return getResponseMessage(body);
  }

  switch (body.XErr) {
    case 2148916227:
      return "This Xbox account is banned.";
    case 2148916233:
      return "This Microsoft account does not have an Xbox profile yet.";
    case 2148916235:
      return "Xbox Live is not available for this account region.";
    case 2148916236:
    case 2148916237:
      return "This Xbox account requires adult verification before it can sign in.";
    case 2148916238:
      return "This child account must be added to a Microsoft family by an adult before it can sign in.";
    default:
      return `Xbox authorization failed with XErr ${body.XErr}.`;
  }
};

export const isMicrosoftAuthConfigured = (): boolean =>
  Boolean(process.env.NYXEN_MICROSOFT_CLIENT_ID?.trim());

export const startMicrosoftProfileLogin = async (
  options: AuthOptions = {},
): Promise<MicrosoftProfileLoginStart> => {
  const clientId = getClientId(options);
  const fetcher = getFetcher(options);
  const now = getNow(options);
  const timeoutMs = getRequestTimeoutMs(options);
  const response = await postForm(
    "Microsoft device login",
    `${MICROSOFT_AUTHORITY}/devicecode`,
    new URLSearchParams({
      client_id: clientId,
      scope: MICROSOFT_SCOPE,
    }),
    fetcher,
    timeoutMs,
  );
  const body = await requestJson("Microsoft device login", response);
  const expiresIn = getNumber(body, "expires_in", "Microsoft device login");
  const userCode = getString(body, "user_code", "Microsoft device login");
  const verificationUri = getString(
    body,
    "verification_uri",
    "Microsoft device login",
  );

  return {
    deviceCode: getString(body, "device_code", "Microsoft device login"),
    expiresAt: new Date(now.getTime() + expiresIn * 1000).toISOString(),
    intervalSeconds: getNumber(body, "interval", "Microsoft device login"),
    message:
      getOptionalString(body, "message") ??
      `Go to ${verificationUri} and enter ${userCode}.`,
    userCode,
    verificationUri,
    verificationUriComplete: getOptionalString(
      body,
      "verification_uri_complete",
    ),
  };
};

const pollMicrosoftDeviceToken = async (
  deviceCode: string,
  options: AuthOptions,
): Promise<MicrosoftAccessToken | MicrosoftProfileLoginResult> => {
  const clientId = getClientId(options);
  const fetcher = getFetcher(options);
  const timeoutMs = getRequestTimeoutMs(options);
  const response = await postForm(
    "Microsoft device token",
    `${MICROSOFT_AUTHORITY}/token`,
    new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
    fetcher,
    timeoutMs,
  );
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    const error = getOptionalString(body, "error");

    if (error === "authorization_pending" || error === "slow_down") {
      return {
        message: "Waiting for Microsoft sign-in to finish.",
        retryAfterSeconds: error === "slow_down" ? 10 : 5,
        status: "pending",
      };
    }

    throw formatHttpError("Microsoft device token", response, body);
  }

  return {
    accessToken: getString(body, "access_token", "Microsoft device token"),
    expiresIn: getNumber(body, "expires_in", "Microsoft device token"),
    refreshToken: getOptionalString(body, "refresh_token"),
  };
};

const refreshMicrosoftAccessToken = async (
  refreshToken: string,
  options: AuthOptions,
): Promise<MicrosoftAccessToken> => {
  const clientId = getClientId(options);
  const fetcher = getFetcher(options);
  const timeoutMs = getRequestTimeoutMs(options);
  const response = await postForm(
    "Microsoft token refresh",
    `${MICROSOFT_AUTHORITY}/token`,
    new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: MICROSOFT_SCOPE,
    }),
    fetcher,
    timeoutMs,
  );
  const body = await requestJson("Microsoft token refresh", response);

  return {
    accessToken: getString(body, "access_token", "Microsoft token refresh"),
    expiresIn: getNumber(body, "expires_in", "Microsoft token refresh"),
    refreshToken: getOptionalString(body, "refresh_token") ?? refreshToken,
  };
};

const authenticateXboxLive = async (
  microsoftAccessToken: string,
  fetcher: AuthFetch,
  timeoutMs: number,
): Promise<XboxToken> => {
  const response = await postJson(
    "Xbox Live authentication",
    XBOX_AUTH_URL,
    {
      Properties: {
        AuthMethod: "RPS",
        RpsTicket: `d=${microsoftAccessToken}`,
        SiteName: "user.auth.xboxlive.com",
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    },
    fetcher,
    timeoutMs,
  );
  const body = await requestJson("Xbox Live authentication", response);

  return {
    token: getString(body, "Token", "Xbox Live authentication"),
    userHash: getUserHash(body, "Xbox Live authentication"),
  };
};

const authorizeMinecraftXsts = async (
  xboxToken: string,
  fetcher: AuthFetch,
  timeoutMs: number,
): Promise<XboxToken> => {
  const response = await postJson(
    "Xbox authorization",
    XSTS_AUTH_URL,
    {
      Properties: {
        SandboxId: "RETAIL",
        UserTokens: [xboxToken],
      },
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT",
    },
    fetcher,
    timeoutMs,
  );
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    const message = getXstsErrorMessage(body);

    throw new Error(
      message
        ? `Xbox authorization failed: ${message}`
        : `Xbox authorization failed with HTTP ${response.status}.`,
    );
  }

  return {
    token: getString(body, "Token", "Xbox authorization"),
    userHash: getUserHash(body, "Xbox authorization"),
  };
};

const loginWithMinecraft = async (
  userHash: string,
  xstsToken: string,
  fetcher: AuthFetch,
  timeoutMs: number,
): Promise<MinecraftAccessToken> => {
  const response = await postJson(
    "Minecraft authentication",
    MINECRAFT_LOGIN_URL,
    {
      identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
    },
    fetcher,
    timeoutMs,
  );
  const body = await requestJson("Minecraft authentication", response);

  return {
    accessToken: getString(body, "access_token", "Minecraft authentication"),
    expiresIn: getNumber(body, "expires_in", "Minecraft authentication"),
  };
};

const getMinecraftEntitlements = async (
  minecraftAccessToken: string,
  fetcher: AuthFetch,
  timeoutMs: number,
): Promise<Array<string>> => {
  const response = await getJson(
    "Minecraft ownership check",
    MINECRAFT_ENTITLEMENTS_URL,
    {
      accept: "application/json",
      authorization: `Bearer ${minecraftAccessToken}`,
    },
    fetcher,
    timeoutMs,
  );
  const body = await requestJson("Minecraft ownership check", response);
  const items = isRecord(body) && Array.isArray(body.items) ? body.items : [];

  return items
    .map((item) =>
      isRecord(item) && typeof item.name === "string" ? item.name : null,
    )
    .filter((name): name is string => Boolean(name));
};

const assertMinecraftOwnership = (entitlements: Array<string>): void => {
  const entitlementSet = new Set(entitlements);
  const ownsJava = [...REQUIRED_ENTITLEMENTS].every((entitlement) =>
    entitlementSet.has(entitlement),
  );

  if (!ownsJava) {
    throw new Error(
      "This Microsoft account does not own Minecraft: Java Edition.",
    );
  }
};

const getMinecraftProfile = async (
  minecraftAccessToken: string,
  fetcher: AuthFetch,
  timeoutMs: number,
): Promise<{ id: string; name: string; skinUrl: string | null }> => {
  const response = await getJson(
    "Minecraft profile lookup",
    MINECRAFT_PROFILE_URL,
    {
      accept: "application/json",
      authorization: `Bearer ${minecraftAccessToken}`,
    },
    fetcher,
    timeoutMs,
  );
  const body = await requestJson("Minecraft profile lookup", response);
  const skins = isRecord(body) && Array.isArray(body.skins) ? body.skins : [];
  const activeSkin = skins.find(
    (skin) => isRecord(skin) && skin.state === "ACTIVE",
  );

  return {
    id: getString(body, "id", "Minecraft profile lookup"),
    name: getString(body, "name", "Minecraft profile lookup"),
    skinUrl:
      isRecord(activeSkin) && typeof activeSkin.url === "string"
        ? activeSkin.url
        : null,
  };
};

const authenticateMinecraftAccount = async (
  microsoftToken: MicrosoftAccessToken,
  options: AuthOptions,
): Promise<MinecraftAccount> => {
  const fetcher = getFetcher(options);
  const now = getNow(options);
  const timeoutMs = getRequestTimeoutMs(options);
  const xboxToken = await authenticateXboxLive(
    microsoftToken.accessToken,
    fetcher,
    timeoutMs,
  );
  const xstsToken = await authorizeMinecraftXsts(
    xboxToken.token,
    fetcher,
    timeoutMs,
  );
  const minecraftToken = await loginWithMinecraft(
    xstsToken.userHash || xboxToken.userHash,
    xstsToken.token,
    fetcher,
    timeoutMs,
  );
  const entitlements = await getMinecraftEntitlements(
    minecraftToken.accessToken,
    fetcher,
    timeoutMs,
  );

  assertMinecraftOwnership(entitlements);

  const minecraftProfile = await getMinecraftProfile(
    minecraftToken.accessToken,
    fetcher,
    timeoutMs,
  );

  return {
    accountId: minecraftProfile.id,
    displayName: minecraftProfile.name,
    entitlements,
    minecraftAccessToken: minecraftToken.accessToken,
    minecraftAccessTokenExpiresAt: new Date(
      now.getTime() + minecraftToken.expiresIn * 1000,
    ).toISOString(),
    microsoftRefreshToken: microsoftToken.refreshToken,
    ownershipCheckedAt: now.toISOString(),
    skinUrl: minecraftProfile.skinUrl,
  };
};

const readMicrosoftProfileLoginJob = (
  deviceCode: string,
): MicrosoftProfileLoginResult | null => {
  const job = microsoftProfileLoginJobs.get(deviceCode);

  if (!job) {
    return null;
  }

  if (job.status === "complete") {
    microsoftProfileLoginJobs.delete(deviceCode);

    return {
      profile: job.profile,
      status: "complete",
    };
  }

  if (job.status === "error") {
    microsoftProfileLoginJobs.delete(deviceCode);
    throw new Error(job.error);
  }

  return {
    message: "Checking Minecraft ownership for this Microsoft account.",
    retryAfterSeconds: 2,
    status: "pending",
  };
};

const startMicrosoftProfileLoginJob = (
  deviceCode: string,
  microsoftToken: MicrosoftAccessToken,
  options: AuthOptions,
): MicrosoftProfileLoginResult => {
  microsoftProfileLoginJobs.set(deviceCode, {
    createdAt: Date.now(),
    status: "running",
  });

  void authenticateMinecraftAccount(microsoftToken, options)
    .then((account) => {
      microsoftProfileLoginJobs.set(deviceCode, {
        createdAt: Date.now(),
        profile: upsertVerifiedMicrosoftProfile(account),
        status: "complete",
      });
    })
    .catch((error: unknown) => {
      microsoftProfileLoginJobs.set(deviceCode, {
        createdAt: Date.now(),
        error: getErrorMessage(error, "Failed to verify Minecraft ownership."),
        status: "error",
      });
    });

  return {
    message: "Microsoft sign-in finished. Checking Minecraft ownership.",
    retryAfterSeconds: 2,
    status: "pending",
  };
};

export const pollMicrosoftProfileSignIn = async (
  input: CompleteMicrosoftProfileLoginInput,
  options: AuthOptions = {},
): Promise<MicrosoftProfileSignInStatus> => {
  const deviceCode = input.deviceCode.trim();

  if (!deviceCode) {
    throw new Error("Microsoft device login code is required.");
  }

  cleanupMicrosoftProfileLoginJobs(Date.now());

  if (microsoftProfileSignInTokens.has(deviceCode)) {
    return {
      message: "Signed in to Microsoft. Verify Minecraft ownership to finish.",
      status: "signedIn",
    };
  }

  const token = await pollMicrosoftDeviceToken(deviceCode, options);

  if ("status" in token) {
    if (token.status === "pending") {
      return token;
    }

    throw new Error("Unexpected Microsoft sign-in completion state.");
  }

  microsoftProfileSignInTokens.set(deviceCode, {
    createdAt: Date.now(),
    token,
  });

  return {
    message: "Signed in to Microsoft. Verify Minecraft ownership to finish.",
    status: "signedIn",
  };
};

export const completeMicrosoftProfileLogin = async (
  input: CompleteMicrosoftProfileLoginInput,
  options: AuthOptions = {},
): Promise<MicrosoftProfileLoginResult> => {
  const deviceCode = input.deviceCode.trim();

  if (!deviceCode) {
    throw new Error("Microsoft device login code is required.");
  }

  cleanupMicrosoftProfileLoginJobs(Date.now());

  const existingJobResult = readMicrosoftProfileLoginJob(deviceCode);

  if (existingJobResult) {
    return existingJobResult;
  }

  const cachedToken = microsoftProfileSignInTokens.get(deviceCode);
  const token =
    cachedToken?.token ?? (await pollMicrosoftDeviceToken(deviceCode, options));

  if ("status" in token) {
    return token;
  }

  microsoftProfileSignInTokens.delete(deviceCode);

  return startMicrosoftProfileLoginJob(deviceCode, token, options);
};

export const refreshMicrosoftLauncherProfile = async (
  profileId: string,
  options: AuthOptions = {},
): Promise<LauncherProfile> => {
  const secrets = getLauncherProfileAuthSecrets(profileId);

  if (!secrets || secrets.profile.kind !== "microsoft") {
    throw new Error("A verified Microsoft profile is required.");
  }

  if (!secrets.microsoftRefreshToken) {
    throw new Error("This Microsoft profile needs to be signed in again.");
  }

  const microsoftToken = await refreshMicrosoftAccessToken(
    secrets.microsoftRefreshToken,
    options,
  );
  const account = await authenticateMinecraftAccount(microsoftToken, options);

  return updateVerifiedMicrosoftProfile(profileId, account);
};

export const ensureMicrosoftProfileLaunchAuth = async (
  profile: LauncherProfile | null,
  options: AuthOptions = {},
): Promise<LauncherProfile> => {
  if (!profile) {
    throw new Error(
      "A verified Microsoft profile is required before creating a launch plan.",
    );
  }

  if (!isProfileVerifiedForMinecraft(profile)) {
    throw new Error(
      "This launcher profile is not backed by a Microsoft account that owns Minecraft: Java Edition.",
    );
  }

  const expiresAt = Date.parse(profile.authExpiresAt ?? "");
  const refreshThreshold = getNow(options).getTime() + 60_000;

  if (!Number.isFinite(expiresAt) || expiresAt <= refreshThreshold) {
    return refreshMicrosoftLauncherProfile(profile.id, options);
  }

  return profile;
};
