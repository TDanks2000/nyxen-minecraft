import { spawn } from "node:child_process";
import { release } from "node:os";
import type { LaunchInstanceResult, LaunchPlan } from "../../shared/types";

type ConditionalArg = {
  rules: Array<{
    action: string;
    features?: Record<string, boolean>;
    os?: { arch?: string; name?: string; version?: string };
  }>;
  value: Array<string> | string;
};

const isConditionalArg = (arg: unknown): arg is ConditionalArg =>
  typeof arg === "object" &&
  arg !== null &&
  "rules" in arg &&
  "value" in (arg as Record<string, unknown>);

const currentOs = (): "linux" | "osx" | "windows" => {
  if (process.platform === "darwin") return "osx";
  if (process.platform === "win32") return "windows";
  return "linux";
};

const evaluateConditionalArg = (arg: ConditionalArg): Array<string> => {
  let allowed = false;

  for (const rule of arg.rules) {
    // Feature flags (e.g. has_custom_resolution, is_demo_user) — skip for now
    if (rule.features) {
      continue;
    }

    let matches = true;
    const os = rule.os;

    if (os) {
      if (os.name && os.name !== currentOs()) {
        matches = false;
      }

      if (matches && os.arch && os.arch !== process.arch) {
        matches = false;
      }

      if (matches && os.version) {
        matches = new RegExp(os.version).test(release());
      }
    }

    if (matches) {
      allowed = rule.action === "allow";
    }
  }

  if (!allowed) {
    return [];
  }

  const { value } = arg;

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }

  return [];
};

const evaluateArg = (arg: unknown): Array<string> => {
  if (typeof arg === "string") {
    return [arg];
  }

  if (isConditionalArg(arg)) {
    return evaluateConditionalArg(arg);
  }

  return [];
};

const substituteVars = (
  template: string,
  vars: Record<string, string>,
): string =>
  template.replace(/\$\{([^}]+)\}/g, (_, key: string) => vars[key] ?? "");

export type LaunchOptions = {
  accessToken?: string;
};

const buildCommand = (
  plan: LaunchPlan,
  options: LaunchOptions,
): { args: Array<string>; executable: string } => {
  const sep = process.platform === "win32" ? ";" : ":";
  const accessToken = options.accessToken ?? "0";

  const vars: Record<string, string> = {
    assets_index_name: plan.minecraft.assetIndexId ?? plan.minecraft.versionId,
    assets_root: plan.directories.assets,
    auth_access_token: accessToken,
    auth_player_name: plan.profile?.displayName ?? "Player",
    auth_uuid:
      plan.profile?.accountId ?? "00000000-0000-0000-0000-000000000000",
    classpath: plan.classpath.join(sep),
    game_directory: plan.directories.game,
    launcher_name: "nyxen",
    launcher_version: "1.0",
    natives_directory: plan.directories.natives,
    resolution_height: "480",
    resolution_width: "854",
    user_type: plan.profile?.kind === "microsoft" ? "msa" : "legacy",
    version_name: plan.minecraft.versionId,
    version_type: "release",
  };

  const memoryArgs = [
    `-Xms${plan.java.memoryMinMb}m`,
    `-Xmx${plan.java.memoryMaxMb}m`,
  ];

  const jvmArgs: Array<string> = [];

  if (plan.legacyArgFormat) {
    // Pre-1.13 versions: version JSON has no jvm args, add them manually
    jvmArgs.push(
      `-Djava.library.path=${plan.directories.natives}`,
      `-Dminecraft.launcher.brand=nyxen`,
      `-Dminecraft.launcher.version=1.0`,
      "-cp",
      vars.classpath ?? "",
    );
  } else {
    for (const arg of plan.arguments.jvm) {
      jvmArgs.push(
        ...evaluateArg(arg).map((a) => substituteVars(a, vars)),
      );
    }
  }

  const mainClass =
    plan.minecraft.mainClass ?? "net.minecraft.client.main.Main";

  const gameArgs: Array<string> = [];

  for (const arg of plan.arguments.game) {
    gameArgs.push(...evaluateArg(arg).map((a) => substituteVars(a, vars)));
  }

  return {
    args: [...memoryArgs, ...jvmArgs, mainClass, ...gameArgs],
    executable: plan.java.executable,
  };
};

export const launchMinecraft = (
  plan: LaunchPlan,
  options: LaunchOptions = {},
): LaunchInstanceResult => {
  const { executable, args } = buildCommand(plan, options);

  const child = spawn(executable, args, {
    cwd: plan.directories.game,
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  if (!child.pid) {
    throw new Error(
      "Failed to start Java. Make sure Java is installed and available on PATH.",
    );
  }

  return { pid: child.pid };
};
