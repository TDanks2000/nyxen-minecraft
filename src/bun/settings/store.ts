import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  AppSettings,
  JavaManagementMode,
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
export const DOWNLOAD_CONCURRENCY_SETTING_KEY = "launcher.downloadConcurrency";
export const ASSET_CONCURRENCY_SETTING_KEY = "launcher.assetConcurrency";
export const DOWNLOAD_TIMEOUT_SETTING_KEY = "launcher.downloadTimeoutSeconds";
export const DOWNLOAD_RETRIES_SETTING_KEY = "launcher.downloadRetries";

const defaultSettings: AppSettings = {
  "app.theme": "system",
  [JAVA_MANAGEMENT_SETTING_KEY]: "auto",
  [LOW_END_MODE_SETTING_KEY]: false,
  "launcher.keepOpenAfterLaunch": false,
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

  const normalized = { ...defaultSettings, ...settings };

  if (!isJavaManagementMode(normalized[JAVA_MANAGEMENT_SETTING_KEY])) {
    normalized[JAVA_MANAGEMENT_SETTING_KEY] = "auto";
  }

  if (typeof normalized[LOW_END_MODE_SETTING_KEY] !== "boolean") {
    normalized[LOW_END_MODE_SETTING_KEY] = false;
  }

  return normalized;
};

let settingsCache: AppSettings | null = null;

const writeSettingsFile = (settings: AppSettings): void => {
  ensurePrivateDirectory(dirname(settingsPath));
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  ensurePrivateFile(settingsPath);
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
    settingsCache = normalizeSettings(JSON.parse(readFileSync(settingsPath, "utf8")));
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
  clampedInt(
    readSettingsFile()[DOWNLOAD_CONCURRENCY_SETTING_KEY],
    1,
    16,
  );

export const getAssetConcurrencySetting = (): number | null =>
  clampedInt(
    readSettingsFile()[ASSET_CONCURRENCY_SETTING_KEY],
    1,
    32,
  );

export const getDownloadTimeoutSecondsSetting = (): number | null =>
  clampedInt(
    readSettingsFile()[DOWNLOAD_TIMEOUT_SETTING_KEY],
    10,
    300,
  );

export const getDownloadRetriesSetting = (): number | null =>
  clampedInt(
    readSettingsFile()[DOWNLOAD_RETRIES_SETTING_KEY],
    1,
    5,
  );

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

  const values = readSettingsFile();
  values[normalizedKey] = value;
  writeSettingsFile(values);

  return getSettingsStatus();
};
