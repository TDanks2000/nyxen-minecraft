import {
  existsSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type {
  AppSettings,
  AppTheme,
  JavaManagementMode,
  LauncherOnLaunchAction,
  SettingsStatus,
  SettingValue,
} from "../../shared/types";
import {
  ensurePrivateDirectory,
  ensurePrivateFile,
  getDataRoot,
} from "../launcher/paths";

export const JAVA_MANAGEMENT_SETTING_KEY = "launcher.javaManagement";
export const LOW_END_MODE_SETTING_KEY = "launcher.lowEndMode";
export const KEEP_OPEN_AFTER_LAUNCH_SETTING_KEY =
  "launcher.keepOpenAfterLaunch";
export const ON_LAUNCH_SETTING_KEY = "launcher.onLaunch";
export const DOWNLOAD_CONCURRENCY_SETTING_KEY = "launcher.downloadConcurrency";
export const ASSET_CONCURRENCY_SETTING_KEY = "launcher.assetConcurrency";
export const DOWNLOAD_TIMEOUT_SETTING_KEY = "launcher.downloadTimeoutSeconds";
export const DOWNLOAD_RETRIES_SETTING_KEY = "launcher.downloadRetries";
export const APP_THEME_SETTING_KEY = "app.theme";

const appThemes = new Set<AppTheme>([
  "dark",
  "midnight",
  "forest",
  "amber",
  "light",
  "system",
]);

const onLaunchActions = new Set<LauncherOnLaunchAction>([
  "keep",
  "minimize",
  "hide",
  "close",
]);

const defaultSettings: AppSettings = {
  [APP_THEME_SETTING_KEY]: "dark",
  [JAVA_MANAGEMENT_SETTING_KEY]: "auto",
  [LOW_END_MODE_SETTING_KEY]: false,
  [KEEP_OPEN_AFTER_LAUNCH_SETTING_KEY]: true,
  [ON_LAUNCH_SETTING_KEY]: "keep",
  "launcher.showSnapshots": false,
  [DOWNLOAD_CONCURRENCY_SETTING_KEY]: null,
  [ASSET_CONCURRENCY_SETTING_KEY]: null,
  [DOWNLOAD_TIMEOUT_SETTING_KEY]: null,
  [DOWNLOAD_RETRIES_SETTING_KEY]: null,
};

export const isJavaManagementMode = (
  value: unknown,
): value is JavaManagementMode =>
  value === "auto" || value === "app-controlled";

export const isAppTheme = (value: unknown): value is AppTheme =>
  typeof value === "string" && appThemes.has(value as AppTheme);

export const isLauncherOnLaunchAction = (
  value: unknown,
): value is LauncherOnLaunchAction =>
  typeof value === "string" &&
  onLaunchActions.has(value as LauncherOnLaunchAction);

export const settingsPath = join(getDataRoot(), "settings.json");

const isSettingValue = (value: unknown): value is SettingValue =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const normalizeSettings = (value: unknown): AppSettings => {
  const settings: AppSettings = {};

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultSettings };
  }

  for (const [key, settingValue] of Object.entries(value)) {
    if (isSettingValue(settingValue)) {
      settings[key] = settingValue;
    }
  }

  const hasExplicitOnLaunch = Object.hasOwn(settings, ON_LAUNCH_SETTING_KEY);
  const normalized = { ...defaultSettings, ...settings };

  if (!isAppTheme(normalized[APP_THEME_SETTING_KEY])) {
    normalized[APP_THEME_SETTING_KEY] = "dark";
  }

  if (!isJavaManagementMode(normalized[JAVA_MANAGEMENT_SETTING_KEY])) {
    normalized[JAVA_MANAGEMENT_SETTING_KEY] = "auto";
  }

  if (!hasExplicitOnLaunch) {
    normalized[ON_LAUNCH_SETTING_KEY] =
      settings[KEEP_OPEN_AFTER_LAUNCH_SETTING_KEY] === false
        ? "minimize"
        : "keep";
  }

  if (!isLauncherOnLaunchAction(normalized[ON_LAUNCH_SETTING_KEY])) {
    normalized[ON_LAUNCH_SETTING_KEY] = "keep";
  }

  if (typeof normalized[LOW_END_MODE_SETTING_KEY] !== "boolean") {
    normalized[LOW_END_MODE_SETTING_KEY] = false;
  }

  return normalized;
};

let settingsCache: AppSettings | null = null;

const writeSettingsFile = (settings: AppSettings): void => {
  ensurePrivateDirectory(dirname(settingsPath));

  const tempPath = `${settingsPath}.write-${process.pid}-${crypto.randomUUID()}.tmp`;

  try {
    writeFileSync(tempPath, `${JSON.stringify(settings, null, 2)}\n`, {
      flag: "wx",
    });
    ensurePrivateFile(tempPath);
    renameSync(tempPath, settingsPath);
    ensurePrivateFile(settingsPath);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }

  settingsCache = settings;
};

const readSettingsFile = (): AppSettings => {
  if (settingsCache) return settingsCache;

  ensurePrivateDirectory(dirname(settingsPath));

  if (!existsSync(settingsPath)) {
    const settings = { ...defaultSettings };
    writeSettingsFile(settings);
    return settings;
  }

  try {
    settingsCache = normalizeSettings(
      JSON.parse(readFileSync(settingsPath, "utf8")),
    );
    return settingsCache;
  } catch {
    const settings = { ...defaultSettings };
    writeSettingsFile(settings);
    return settings;
  }
};

export const getJavaManagementMode = (): JavaManagementMode => {
  const settings = readSettingsFile();
  const mode = settings[JAVA_MANAGEMENT_SETTING_KEY];

  return isJavaManagementMode(mode) ? mode : "auto";
};

export const isLowEndModeEnabled = (): boolean => {
  const settings = readSettingsFile();

  return settings[LOW_END_MODE_SETTING_KEY] === true;
};

export const isKeepLauncherOpenAfterLaunchEnabled = (): boolean => {
  return getOnLaunchAction() === "keep";
};

export const getOnLaunchAction = (): LauncherOnLaunchAction => {
  const settings = readSettingsFile();
  const value = settings[ON_LAUNCH_SETTING_KEY];

  return isLauncherOnLaunchAction(value) ? value : "keep";
};

export const getSettingsStatus = (): SettingsStatus => {
  const values = readSettingsFile();

  return {
    path: settingsPath,
    storage: "json",
    updatedAt: statSync(settingsPath).mtime.toISOString(),
    values,
  };
};

const clampedInt = (
  value: unknown,
  min: number,
  max: number,
): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  return n >= min && n <= max ? n : null;
};

export const getDownloadConcurrencySetting = (): number | null =>
  clampedInt(readSettingsFile()[DOWNLOAD_CONCURRENCY_SETTING_KEY], 1, 16);

export const getAssetConcurrencySetting = (): number | null =>
  clampedInt(readSettingsFile()[ASSET_CONCURRENCY_SETTING_KEY], 1, 32);

export const getDownloadTimeoutSecondsSetting = (): number | null =>
  clampedInt(readSettingsFile()[DOWNLOAD_TIMEOUT_SETTING_KEY], 10, 300);

export const getDownloadRetriesSetting = (): number | null =>
  clampedInt(readSettingsFile()[DOWNLOAD_RETRIES_SETTING_KEY], 1, 5);

export const updateSetting = ({
  key,
  value,
}: {
  key: string;
  value: SettingValue;
}): SettingsStatus => {
  const normalizedKey = key.trim();

  if (!normalizedKey) {
    throw new Error("Setting key is required.");
  }

  if (
    normalizedKey === JAVA_MANAGEMENT_SETTING_KEY &&
    !isJavaManagementMode(value)
  ) {
    throw new Error("Java management mode must be auto or app-controlled.");
  }

  if (normalizedKey === APP_THEME_SETTING_KEY && !isAppTheme(value)) {
    throw new Error(
      "Theme must be dark, midnight, forest, amber, light, or system.",
    );
  }

  if (
    normalizedKey === ON_LAUNCH_SETTING_KEY &&
    !isLauncherOnLaunchAction(value)
  ) {
    throw new Error("Launch behavior must be keep, minimize, hide, or close.");
  }

  const values = readSettingsFile();
  values[normalizedKey] = value;
  writeSettingsFile(values);

  return getSettingsStatus();
};
