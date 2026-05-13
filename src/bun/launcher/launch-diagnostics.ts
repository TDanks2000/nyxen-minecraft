import { randomUUID } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type {
  LaunchAttemptOutcome,
  LaunchAttemptRecord,
  LauncherInstance,
  LaunchPlan,
  LaunchPlanSummary,
  LaunchRepairSuggestion,
} from "../../shared/types";
import { ensurePrivateDirectory, ensurePrivateFile } from "./paths";

const launchPlanSummaryFileName = "launch-plan-summary.json";
const launchAttemptsFolderName = "launch-attempts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getLaunchPlanSummaryPath = (instance: LauncherInstance): string =>
  join(instance.folders.metadata, launchPlanSummaryFileName);

const getLaunchAttemptsDirectory = (instance: LauncherInstance): string =>
  join(instance.folders.metadata, launchAttemptsFolderName);

const parseLaunchAttemptRecord = (
  value: unknown,
): LaunchAttemptRecord | null => {
  if (!isRecord(value) || value.schemaVersion !== 1) return null;
  if (typeof value.id !== "string" || typeof value.createdAt !== "string") {
    return null;
  }
  if (!isRecord(value.outcome) || !isRecord(value.planSummary)) return null;

  const record = value as LaunchAttemptRecord;

  return {
    ...record,
    repair:
      record.repair ??
      classifyLaunchAttempt({
        outcome: record.outcome,
        planSummary: record.planSummary,
      }),
  };
};

const repairEvidence = (
  outcome: LaunchAttemptOutcome,
  planSummary: LaunchPlanSummary,
  extra: Array<string> = [],
): Array<string> =>
  [
    outcome.message,
    ...extra,
    ...planSummary.warnings.slice(0, 3),
    ...planSummary.missingArtifacts
      .slice(0, 3)
      .map((artifact) => `${artifact.kind}: ${artifact.id}`),
  ].filter((item) => item.trim().length > 0);

const hasJavaMismatchWarning = (planSummary: LaunchPlanSummary): boolean =>
  planSummary.warnings.some(
    (warning) =>
      warning.includes("requires Java") &&
      (warning.includes("detected Java") ||
        warning.includes("could not be detected")),
  );

const hasAuthFailureEvidence = (
  outcome: LaunchAttemptOutcome,
  planSummary: LaunchPlanSummary,
): boolean => {
  const searchable = [outcome.message, ...planSummary.warnings]
    .join(" ")
    .toLowerCase();

  return [
    "authlib",
    "authentication",
    "expired token",
    "invalid session",
    "invalid token",
    "microsoft profile needs to be signed in again",
    "sign in again",
    "stale auth",
    "yggdrasil",
  ].some((needle) => searchable.includes(needle));
};

const hasNativeExtractionFailureEvidence = (
  outcome: LaunchAttemptOutcome,
  planSummary: LaunchPlanSummary,
): boolean => {
  const searchable = [outcome.message, ...planSummary.warnings]
    .join(" ")
    .toLowerCase();

  return [
    "failed to extract native",
    "java.library.path",
    "lwjgl",
    "native library",
    "no lwjgl",
    "org.lwjgl",
    "unsatisfiedlinkerror",
  ].some((needle) => searchable.includes(needle));
};

const hasCorruptArtifactEvidence = (
  outcome: LaunchAttemptOutcome,
  planSummary: LaunchPlanSummary,
): boolean => {
  const searchable = [outcome.message, ...planSummary.warnings]
    .join(" ")
    .toLowerCase();

  return [
    "checksum mismatch",
    "corrupt jar",
    "corrupt library",
    "invalid loc header",
    "invalid signature file digest",
    "jar is corrupt",
    "zip end header not found",
    "zipexception",
  ].some((needle) => searchable.includes(needle));
};

export const classifyLaunchAttempt = ({
  outcome,
  planSummary,
}: {
  outcome: LaunchAttemptOutcome;
  planSummary: LaunchPlanSummary;
}): LaunchRepairSuggestion | null => {
  if (outcome.status === "started") {
    return null;
  }

  if (outcome.reason === "missingArtifacts") {
    return {
      actionId: "downloadMissingArtifacts",
      category: "missingFiles",
      confidence: "high",
      evidence: repairEvidence(outcome, planSummary, [
        `${outcome.missingArtifactCount ?? planSummary.counts.missingArtifacts} missing artifact(s)`,
      ]),
      nextAction: "Download the missing launch files, then retry launch.",
      safeToAutomate: true,
      title: "Download missing launch files",
    };
  }

  if (outcome.reason === "missingModpackDependencies") {
    return {
      actionId: "reinstallModpack",
      category: "missingModpackDependency",
      confidence: "high",
      evidence: repairEvidence(outcome, planSummary, [
        `${outcome.missingModpackDependencyCount ?? 0} missing required modpack file(s)`,
      ]),
      nextAction:
        "Reinstall or update the linked modpack so required dependency files are restored.",
      safeToAutomate: false,
      title: "Restore missing modpack dependencies",
    };
  }

  if (outcome.reason === "missingProfile") {
    return {
      actionId: "signInMicrosoft",
      category: "staleAuth",
      confidence: "high",
      evidence: repairEvidence(outcome, planSummary),
      nextAction:
        "Sign in with a Microsoft profile that owns Minecraft, then retry launch.",
      safeToAutomate: false,
      title: "Sign in to Minecraft",
    };
  }

  if (
    outcome.reason === "launchError" &&
    hasAuthFailureEvidence(outcome, planSummary)
  ) {
    return {
      actionId: "signInMicrosoft",
      category: "staleAuth",
      confidence: "high",
      evidence: repairEvidence(outcome, planSummary),
      nextAction:
        "Sign in with the affected Microsoft profile again, then retry launch.",
      safeToAutomate: false,
      title: "Refresh Minecraft sign-in",
    };
  }

  if (
    outcome.reason === "launchError" &&
    hasCorruptArtifactEvidence(outcome, planSummary)
  ) {
    return {
      actionId: "redownloadCorruptArtifacts",
      category: "corruptFiles",
      confidence: "medium",
      evidence: repairEvidence(outcome, planSummary),
      nextAction:
        "Re-download corrupt launch libraries or assets, then retry launch.",
      safeToAutomate: true,
      title: "Re-download corrupt launch files",
    };
  }

  if (
    outcome.reason === "launchError" &&
    hasNativeExtractionFailureEvidence(outcome, planSummary)
  ) {
    return {
      actionId: "reextractNatives",
      category: "nativeExtraction",
      confidence: "medium",
      evidence: repairEvidence(outcome, planSummary),
      nextAction:
        "Re-extract native libraries for this instance, then retry launch.",
      safeToAutomate: true,
      title: "Re-extract native libraries",
    };
  }

  if (
    outcome.reason === "launchError" &&
    (hasJavaMismatchWarning(planSummary) ||
      outcome.message.includes("Failed to start Java"))
  ) {
    const wrongVersion = hasJavaMismatchWarning(planSummary);

    return {
      actionId: "selectJavaRuntime",
      category: wrongVersion ? "wrongJava" : "javaLaunch",
      confidence: wrongVersion ? "high" : "medium",
      evidence: repairEvidence(outcome, planSummary),
      nextAction: wrongVersion
        ? "Select a Java runtime that matches the Minecraft version requirement."
        : "Choose a valid Java executable or enable app-controlled Java.",
      safeToAutomate: false,
      title: wrongVersion
        ? "Select the required Java version"
        : "Fix Java launch",
    };
  }

  return {
    actionId: "inspectLaunchLog",
    category: "unknown",
    confidence: "low",
    evidence: repairEvidence(outcome, planSummary),
    nextAction: "Open the latest launch log and review the first error.",
    safeToAutomate: false,
    title: "Inspect launch log",
  };
};

export const summarizeLaunchPlan = (plan: LaunchPlan): LaunchPlanSummary => ({
  counts: {
    classpathEntries: plan.classpath.length,
    gameArguments: plan.arguments.game.length,
    jvmArguments: plan.arguments.jvm.length,
    missingArtifacts: plan.missingArtifacts.length,
    nativeArtifacts: plan.nativeArtifactPaths.length,
    warnings: plan.warnings.length,
  },
  createdAt: plan.createdAt,
  id: `plan_${randomUUID()}`,
  instance: {
    id: plan.instance.id,
    loader: plan.instance.loader,
    loaderVersion: plan.instance.loaderVersion,
    name: plan.instance.name,
    versionId: plan.instance.versionId,
  },
  java: {
    component: plan.java.component,
    detectedMajorVersion: plan.java.detectedMajorVersion,
    detectedVersion: plan.java.detectedVersion,
    detectionError: plan.java.detectionError,
    executable: plan.java.executable,
    management: plan.java.management,
    majorVersion: plan.java.majorVersion,
    memoryMaxMb: plan.java.memoryMaxMb,
    memoryMinMb: plan.java.memoryMinMb,
    runtimePlatform: plan.java.runtimePlatform,
    runtimeVersion: plan.java.runtimeVersion,
  },
  minecraft: plan.minecraft,
  missingArtifacts: plan.missingArtifacts.map((artifact) => ({ ...artifact })),
  modLoader: plan.modLoader,
  profile: plan.profile
    ? {
        displayName: plan.profile.displayName,
        id: plan.profile.id,
        kind: plan.profile.kind,
      }
    : null,
  schemaVersion: 1,
  warnings: [...plan.warnings],
});

export const persistLaunchPlanSummary = (
  plan: LaunchPlan,
): LaunchPlanSummary => {
  const summary = summarizeLaunchPlan(plan);
  const path = getLaunchPlanSummaryPath(plan.instance);
  const tempPath = `${path}.write-${process.pid}-${randomUUID()}.tmp`;

  ensurePrivateDirectory(dirname(path));

  try {
    writeFileSync(tempPath, `${JSON.stringify(summary, null, 2)}\n`, {
      flag: "wx",
    });
    ensurePrivateFile(tempPath);
    renameSync(tempPath, path);
    ensurePrivateFile(path);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }

  return summary;
};

export const readLaunchPlanSummary = (
  instance: LauncherInstance,
): LaunchPlanSummary | null => {
  const path = getLaunchPlanSummaryPath(instance);

  if (!existsSync(path)) return null;

  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));

    if (!isRecord(parsed) || parsed.schemaVersion !== 1) {
      return null;
    }

    if (typeof parsed.id !== "string" || typeof parsed.createdAt !== "string") {
      return null;
    }

    return parsed as LaunchPlanSummary;
  } catch {
    return null;
  }
};

export const persistLaunchAttempt = (
  plan: LaunchPlan,
  outcome: LaunchAttemptOutcome,
): LaunchAttemptRecord => {
  const createdAt = new Date().toISOString();
  const planSummary = summarizeLaunchPlan(plan);
  const record: LaunchAttemptRecord = {
    createdAt,
    id: `attempt_${randomUUID()}`,
    instance: {
      id: plan.instance.id,
      loader: plan.instance.loader,
      loaderVersion: plan.instance.loaderVersion,
      name: plan.instance.name,
      versionId: plan.instance.versionId,
    },
    outcome,
    planSummary,
    repair: classifyLaunchAttempt({ outcome, planSummary }),
    schemaVersion: 1,
  };
  const directory = getLaunchAttemptsDirectory(plan.instance);
  const safeCreatedAt = createdAt.replaceAll(":", "-");
  const path = join(directory, `${safeCreatedAt}-${record.id}.json`);
  const tempPath = `${path}.write-${process.pid}-${randomUUID()}.tmp`;

  ensurePrivateDirectory(directory);

  try {
    writeFileSync(tempPath, `${JSON.stringify(record, null, 2)}\n`, {
      flag: "wx",
    });
    ensurePrivateFile(tempPath);
    renameSync(tempPath, path);
    ensurePrivateFile(path);
  } finally {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  }

  return record;
};

export const readLaunchAttemptRecords = (
  instance: LauncherInstance,
): Array<LaunchAttemptRecord> => {
  const directory = getLaunchAttemptsDirectory(instance);

  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      try {
        const parsed: unknown = JSON.parse(
          readFileSync(join(directory, entry.name), "utf8"),
        );
        const record = parseLaunchAttemptRecord(parsed);

        return record ? [record] : [];
      } catch {
        return [];
      }
    });
};
