import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  AppSettings,
  SettingsStatus,
  SettingValue,
} from "../../shared/types";
import {
  ensurePrivateDirectory,
  ensurePrivateFile,
  getDataRoot,
} from "../launcher/paths";

const defaultSettings: AppSettings = {
  "app.theme": "system",
  "launcher.keepOpenAfterLaunch": false,
  "launcher.showSnapshots": false,
};

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

  return { ...defaultSettings, ...settings };
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

  const values = readSettingsFile();
  values[normalizedKey] = value;
  writeSettingsFile(values);

  return getSettingsStatus();
};
