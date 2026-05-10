import os from "node:os";
import { fileURLToPath } from "node:url";
import { Utils } from "electrobun/bun";
import { APP_NAME } from "../../../shared/constants";
import type { AppEnvironment } from "../../../shared/types";
import { getDataRoot } from "../../launcher/paths";
import { isPathInsideDirectory } from "../../launcher/validation";

const startedAt = new Date().toISOString();

export const getEnvironment = (): AppEnvironment => ({
  appName: APP_NAME,
  platform: process.platform,
  startedAt,
});

export const greet = ({ name }: { name: string }): { greeting: string } => ({
  greeting: `Hello, ${name || "Electrobun"} from Bun.`,
});

export const logToBun = ({ message }: { message: string }): void => {
  console.log(`[webview] ${message}`);
};

export const getSystemMemory = (): { totalMb: number } => ({
  totalMb: Math.floor(os.totalmem() / 1024 / 1024),
});

const normalizeExternalUrl = (value: string): string => {
  const normalized = value.trim();

  if (
    !normalized ||
    normalized.length > 4096 ||
    normalized.includes("\0") ||
    /[\r\n]/.test(normalized)
  ) {
    throw new Error("External URL is invalid.");
  }

  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    throw new Error("External URL is invalid.");
  }

  if (url.protocol === "file:") {
    const path = fileURLToPath(url);

    if (!isPathInsideDirectory(path, getDataRoot())) {
      throw new Error("External file URL must stay inside launcher storage.");
    }

    return url.toString();
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      "External URL must use HTTP, HTTPS, or launcher file URLs.",
    );
  }

  return url.toString();
};

export const openExternal = ({
  url,
}: {
  url: string;
}): { opened: boolean } => ({
  opened: Utils.openExternal(normalizeExternalUrl(url)),
});

export { getDatabaseStatus } from "../../db/client";
export { getSettingsStatus, updateSetting } from "../../settings/store";
export {
  closeWindow,
  getWindowState,
  minimizeWindow,
  toggleMaximizeWindow,
} from "../../window-controls";
