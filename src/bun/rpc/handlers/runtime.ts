import { readFileSync, realpathSync, statSync } from "node:fs";
import os from "node:os";
import { extname } from "node:path";
import { APP_NAME } from "../../../shared/constants";
import type {
  AppEnvironment,
  ResolveMediaUrlInput,
  ResolveMediaUrlResult,
} from "../../../shared/types";
import { detectInstalledJavaRuntime } from "../../launcher/java-runtimes";
import { getDataRoot } from "../../launcher/paths";
import { isPathInsideDirectory } from "../../launcher/validation";

const startedAt = new Date().toISOString();

type ElectrobunBunModule = typeof import("electrobun/bun");

const getElectrobunUtils = async (): Promise<ElectrobunBunModule["Utils"]> => {
  const module = await import("electrobun/bun");

  return module.Utils;
};

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

const maxRendererMediaBytes = 12 * 1024 * 1024;

const rendererMediaMimeByExtension: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const getRendererMediaMimeType = (path: string): string => {
  const mimeType = rendererMediaMimeByExtension[extname(path).toLowerCase()];

  if (!mimeType) {
    throw new Error("Media file type is not supported.");
  }

  return mimeType;
};

const fileUrlToPath = (url: URL, errorMessage: string): string => {
  try {
    return Bun.fileURLToPath(url);
  } catch {
    throw new Error(errorMessage);
  }
};

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
    const dataRoot = getDataRoot();
    const path = fileUrlToPath(
      url,
      "External file URL must stay inside launcher storage.",
    );

    if (!isPathInsideDirectory(path, dataRoot)) {
      throw new Error("External file URL must stay inside launcher storage.");
    }

    let realPath: string;
    let realDataRoot: string;

    try {
      realPath = realpathSync(path);
      realDataRoot = realpathSync(dataRoot);
    } catch {
      throw new Error(
        "External file URL must point to an existing launcher path.",
      );
    }

    if (!isPathInsideDirectory(realPath, realDataRoot)) {
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

export const openExternal = async ({
  url,
}: {
  url: string;
}): Promise<{ opened: boolean }> => {
  const normalizedUrl = normalizeExternalUrl(url);
  const utils = await getElectrobunUtils();

  return {
    opened: utils.openExternal(normalizedUrl),
  };
};

export const resolveMediaUrl = ({
  url,
}: ResolveMediaUrlInput): ResolveMediaUrlResult => {
  const normalized = url.trim();

  if (
    !normalized ||
    normalized.length > 4096 ||
    normalized.includes("\0") ||
    /[\r\n]/.test(normalized)
  ) {
    throw new Error("Media URL is invalid.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error("Media URL is invalid.");
  }

  if (parsedUrl.protocol === "https:") {
    return { url: parsedUrl.toString() };
  }

  if (parsedUrl.protocol !== "file:") {
    throw new Error("Media URL must use HTTPS or launcher file URLs.");
  }

  const dataRoot = getDataRoot();
  const path = fileUrlToPath(
    parsedUrl,
    "Media file URL must stay inside launcher storage.",
  );

  if (!isPathInsideDirectory(path, dataRoot)) {
    throw new Error("Media file URL must stay inside launcher storage.");
  }

  let realPath: string;
  let realDataRoot: string;

  try {
    realPath = realpathSync(path);
    realDataRoot = realpathSync(dataRoot);
  } catch {
    throw new Error("Media file URL must point to an existing launcher path.");
  }

  if (!isPathInsideDirectory(realPath, realDataRoot)) {
    throw new Error("Media file URL must stay inside launcher storage.");
  }

  const stat = statSync(realPath);

  if (!stat.isFile()) {
    throw new Error("Media URL must point to a file.");
  }

  if (stat.size > maxRendererMediaBytes) {
    throw new Error("Media file is too large.");
  }

  const mimeType = getRendererMediaMimeType(realPath);
  const data = readFileSync(realPath);

  return {
    url: `data:${mimeType};base64,${data.toString("base64")}`,
  };
};

export const detectSystemJava = () => detectInstalledJavaRuntime();

export { getDatabaseStatus } from "../../db/client";
export { getSettingsStatus, updateSetting } from "../../settings/store";
export {
  closeWindow,
  getWindowFrame,
  getWindowState,
  minimizeWindow,
  setWindowFrame,
  toggleMaximizeWindow,
} from "../../window-controls";
