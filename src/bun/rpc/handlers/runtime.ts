import os from "node:os";
import { Utils } from "electrobun/bun";
import { APP_NAME } from "../../../shared/constants";
import type { AppEnvironment } from "../../../shared/types";

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

export const openExternal = ({
  url,
}: {
  url: string;
}): { opened: boolean } => ({
  opened: Utils.openExternal(url),
});

export { getDatabaseStatus } from "../../db/client";
export { getSettingsStatus, updateSetting } from "../../settings/store";
export {
  closeWindow,
  getWindowState,
  minimizeWindow,
  toggleMaximizeWindow,
} from "../../window-controls";
