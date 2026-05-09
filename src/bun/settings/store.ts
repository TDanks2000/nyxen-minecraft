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

const defaultSettings: AppSettings = {
  "app.theme": "system",
  [JAVA_MANAGEMENT_SETTING_KEY]: "auto",
  "launcher.keepOpenAfterLaunch": false,
  "launcher.showSnapshots": false,
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

  return normalized;
};

const writeSettingsFile = (settings: AppSettings): void => {
  ensurePrivateDirectory(dirname(settingsPath));
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  ensurePrivateFile(settingsPath);
};

const readSettingsFile = (): AppSettings => {
  ensurePrivateDirectory(dirname(settingsPath));

  if (!existsSync(settingsPath)) {
    const settings = { ...defaultSettings };
    writeSettingsFile(settings);
    return settings;
  }

  try {
    return normalizeSettings(JSON.parse(readFileSync(settingsPath, "utf8")));
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

export const getSettingsStatus = (): SettingsStatus => {
  const values = readSettingsFile();

  return {
    path: settingsPath,
    storage: "json",
    updatedAt: statSync(settingsPath).mtime.toISOString(),
    values,
  };
};

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
