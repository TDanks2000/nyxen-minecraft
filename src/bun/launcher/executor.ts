import { type ChildProcess, spawn } from "node:child_process";
import { release } from "node:os";
import type {
  LaunchInstanceResult,
  LaunchPlan,
  RunningLaunch,
  StopLaunchInstanceResult,
} from "../../shared/types";
import { getLauncherDirectories } from "./paths";
import {
  assertJavaExecutable,
  assertNativesDirectory,
  assertPathInsideDirectory,
} from "./validation";

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
        try {
          matches = new RegExp(os.version).test(release());
        } catch {
          matches = false;
        }
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

type RunningLaunchEntry = RunningLaunch & {
  child: ChildProcess;
};

const runningLaunches = new Map<string, RunningLaunchEntry>();

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "EPERM"
    );
  }
};

const pruneStoppedLaunches = (): void => {
  for (const [instanceId, launch] of runningLaunches) {
    if (!isProcessAlive(launch.pid)) {
      runningLaunches.delete(instanceId);
    }
  }
};

export const listRunningLaunches = (): Array<RunningLaunch> => {
  pruneStoppedLaunches();

  return Array.from(runningLaunches.values()).map(
    ({ child: _child, ...launch }) => launch,
  );
};

export const stopMinecraftLaunch = (
  instanceId: string,
): StopLaunchInstanceResult => {
  const normalizedInstanceId = instanceId.trim();

  if (!normalizedInstanceId) {
    throw new Error("Launcher instance id is required.");
  }

  pruneStoppedLaunches();

  const launch = runningLaunches.get(normalizedInstanceId);

  if (!launch) {
    return {
      instanceId: normalizedInstanceId,
      pid: null,
      stopped: false,
    };
  }

  const stopped = launch.child.kill("SIGTERM");
  runningLaunches.delete(normalizedInstanceId);

  return {
    instanceId: normalizedInstanceId,
    pid: launch.pid,
    stopped,
  };
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
      jvmArgs.push(...evaluateArg(arg).map((a) => substituteVars(a, vars)));
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

const assertLaunchPlanStorage = (plan: LaunchPlan): void => {
  const directories = getLauncherDirectories();

  assertJavaExecutable(plan.java.executable);
  assertPathInsideDirectory(
    plan.directories.game,
    directories.instances,
    "Game directory",
  );
  assertNativesDirectory(plan.directories.natives);

  for (const classpathEntry of plan.classpath) {
    let isLibraryPath = true;

    try {
      assertPathInsideDirectory(
        classpathEntry,
        directories.libraries,
        "Launch classpath",
      );
    } catch {
      isLibraryPath = false;
    }

    if (!isLibraryPath) {
      assertPathInsideDirectory(
        classpathEntry,
        directories.versions,
        "Launch classpath",
      );
    }
  }
};

export const launchMinecraft = (
  plan: LaunchPlan,
  options: LaunchOptions = {},
): LaunchInstanceResult => {
  assertLaunchPlanStorage(plan);
  pruneStoppedLaunches();

  const existingLaunch = runningLaunches.get(plan.instance.id);

  if (existingLaunch) {
    return {
      instanceId: existingLaunch.instanceId,
      pid: existingLaunch.pid,
      startedAt: existingLaunch.startedAt,
    };
  }

  const { executable, args } = buildCommand(plan, options);

  let child: ChildProcess;

  try {
    child = spawn(executable, args, {
      cwd: plan.directories.game,
      detached: true,
      stdio: "ignore",
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Failed to start Java: ${error.message}`
        : "Failed to start Java.",
    );
  }

  child.once("error", () => {
    if (runningLaunches.get(plan.instance.id)?.child === child) {
      runningLaunches.delete(plan.instance.id);
    }
  });

  if (!child.pid) {
    throw new Error(
      "Failed to start Java. Make sure Java is installed and available on PATH.",
    );
  }

  child.unref();

  const launch: RunningLaunchEntry = {
    child,
    instanceId: plan.instance.id,
    pid: child.pid,
    startedAt: new Date().toISOString(),
  };

  runningLaunches.set(plan.instance.id, launch);
  child.once("exit", () => {
    if (runningLaunches.get(plan.instance.id)?.child === child) {
      runningLaunches.delete(plan.instance.id);
    }
  });

  return {
    instanceId: launch.instanceId,
    pid: launch.pid,
    startedAt: launch.startedAt,
  };
};
