import { randomUUID } from "node:crypto";
import { existsSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  ExportInstanceSupportBundleInput,
  ExportInstanceSupportBundleResult,
  InstanceFileEntry,
  InstanceLogFilePreview,
  InstanceSupportBundle,
  LauncherInstance,
} from "../../shared/types";
import { getInstanceContent, getInstanceLogFile } from "./instance-content";
import { getLauncherInstance } from "./instances";
import {
  readLaunchAttemptRecords,
  readLaunchPlanSummary,
} from "./launch-diagnostics";
import {
  ensurePrivateDirectory,
  ensurePrivateFile,
  getDataRoot,
} from "./paths";

type RedactionKind = InstanceSupportBundle["redactions"]["kinds"][number];

const maxSupportBundleLogs = 5;
const defaultSupportBundleLogs = 2;
const maxSupportBundleLogLines = 200;
const defaultSupportBundleLogLines = 80;
const maxSupportBundleLogBytes = 64 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const escapeRegExp = (value: string): string =>
  value.replaceAll(/[\\^$.*+?()[\]{}|]/g, "\\$&");

const normalizeLimit = (
  value: number | undefined,
  fallback: number,
  max: number,
): number => {
  if (!Number.isFinite(value)) return fallback;

  return Math.min(max, Math.max(0, Math.trunc(value ?? fallback)));
};

const pickEntry = (
  entry: InstanceFileEntry,
): Pick<
  InstanceFileEntry,
  "displayName" | "fileName" | "modifiedAt" | "sizeBytes"
> => ({
  displayName: entry.displayName,
  fileName: entry.fileName,
  modifiedAt: entry.modifiedAt,
  sizeBytes: entry.sizeBytes,
});

const createSupportBundleRedactor = () => {
  const redactionKinds = new Set<RedactionKind>();
  let count = 0;
  const rawPathPatterns: Array<[RedactionKind, string]> = [
    ["dataRootPath", getDataRoot()],
    ["homePath", homedir()],
  ];
  const pathPatterns = rawPathPatterns.filter(
    ([, value]) => value.trim().length > 1,
  );
  const secretPatterns: Array<RegExp> = [
    /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
    /\b(access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization|password)\s*[:=]\s*["']?[^"'\s,;]+/gi,
    /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  ];
  const databaseFilePattern = /\b[\w.-]+\.(?:db|sqlite|sqlite3)\b/gi;

  const replace = (
    value: string,
    pattern: RegExp,
    replacement: string,
    kind: RedactionKind,
  ): string =>
    value.replace(pattern, (match) => {
      if (match === replacement) return match;

      count += 1;
      redactionKinds.add(kind);
      return replacement;
    });

  const redactString = (value: string): string => {
    let redacted = value;

    for (const pattern of secretPatterns) {
      redacted = replace(redacted, pattern, "[redacted-secret]", "secretValue");
    }

    redacted = replace(
      redacted,
      databaseFilePattern,
      "[redacted-database]",
      "databaseFile",
    );

    for (const [kind, path] of pathPatterns) {
      redacted = replace(
        redacted,
        new RegExp(escapeRegExp(path), "g"),
        kind === "dataRootPath" ? "[launcher-data]" : "[home]",
        kind,
      );
    }

    return redacted;
  };

  const redactValue = (value: unknown): unknown => {
    if (typeof value === "string") return redactString(value);
    if (Array.isArray(value)) return value.map(redactValue);

    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, redactValue(item)]),
      );
    }

    return value;
  };

  return {
    get count() {
      return count;
    },
    get kinds() {
      return [...redactionKinds].sort();
    },
    redactValue,
  };
};

const getInstanceOrThrow = (instanceId: string): LauncherInstance => {
  const instance = getLauncherInstance(instanceId);

  if (!instance) {
    throw new Error("Launcher instance does not exist.");
  }

  return instance;
};

const getLogPreview = (
  instanceId: string,
  entry: InstanceFileEntry,
  maxLines: number,
): InstanceSupportBundle["logs"][number] | null => {
  let preview: InstanceLogFilePreview;

  try {
    preview = getInstanceLogFile({
      fileId: entry.id,
      instanceId,
      maxBytes: maxSupportBundleLogBytes,
      maxLines,
    });
  } catch {
    return null;
  }

  return {
    entry: pickEntry(preview.entry),
    lines: preview.lines.map((line) => ({
      details: line.details,
      groupLabel: line.groupLabel,
      level: line.level,
      lineNumber: line.lineNumber,
      message: line.message,
      source: line.source,
      thread: line.thread,
      timestamp: line.timestamp,
      type: line.type,
    })),
    readBytes: preview.readBytes,
    summary: preview.summary,
    totalBytes: preview.totalBytes,
    truncated: preview.truncated,
  };
};

export const exportInstanceSupportBundle = ({
  instanceId,
  maxLogLines,
  maxLogs,
}: ExportInstanceSupportBundleInput): ExportInstanceSupportBundleResult => {
  const instance = getInstanceOrThrow(instanceId.trim());
  const content = getInstanceContent({ instanceId: instance.id });
  const logLimit = normalizeLimit(
    maxLogs,
    defaultSupportBundleLogs,
    maxSupportBundleLogs,
  );
  const lineLimit = normalizeLimit(
    maxLogLines,
    defaultSupportBundleLogLines,
    maxSupportBundleLogLines,
  );
  const logs = content.logs.slice(0, logLimit).flatMap((entry) => {
    const preview = getLogPreview(instance.id, entry, lineLimit);

    return preview ? [preview] : [];
  });
  const redactor = createSupportBundleRedactor();
  const createdAt = new Date().toISOString();
  const rawBundle: Omit<InstanceSupportBundle, "redactions"> = {
    content: {
      counts: content.counts,
      logs: content.logs.map(pickEntry),
      recipe: content.recipe
        ? {
            counts: content.recipe.counts,
            revisionId: content.recipe.revision.id,
            source: content.recipe.revision.source.kind,
            status: content.recipe.status,
          }
        : null,
    },
    createdAt,
    instance: {
      id: instance.id,
      loader: instance.loader,
      loaderVersion: instance.loaderVersion,
      name: instance.name,
      versionId: instance.versionId,
    },
    launchAttempts: readLaunchAttemptRecords(instance),
    launchPlanSummary: readLaunchPlanSummary(instance),
    logs,
    redacted: true,
    schemaVersion: 1,
  };
  const bundle = redactor.redactValue(rawBundle) as InstanceSupportBundle;

  bundle.redactions = {
    count: redactor.count,
    kinds: redactor.kinds,
  };

  const directory = join(instance.folders.metadata, "support-bundles");
  const safeCreatedAt = createdAt.replaceAll(":", "-");
  const path = join(directory, `${safeCreatedAt}-support-${randomUUID()}.json`);
  const tempPath = `${path}.write-${process.pid}-${randomUUID()}.tmp`;

  ensurePrivateDirectory(dirname(path));

  try {
    writeFileSync(tempPath, `${JSON.stringify(bundle, null, 2)}\n`, {
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

  return { bundle, path };
};
