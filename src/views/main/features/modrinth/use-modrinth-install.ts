import { toast } from "sonner";
import type {
  DownloadModrinthFileInput,
  InstanceContent,
  LauncherInstance,
  ModrinthCategory,
  ModrinthProjectSummary,
} from "@/shared/types";
import type { SelectedInstance } from "@/views/main/features/curseforge/curseforge-browser-types";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";

type UseModrinthInstallOptions = {
  onContentUpdated?: (content: InstanceContent) => Promise<void> | void;
  onInstanceCreated?: (instance: LauncherInstance) => Promise<void> | void;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getTargetLabel = (
  category: ModrinthCategory,
  instance: SelectedInstance | null,
): string =>
  category === "modpacks"
    ? "as a new instance"
    : instance
      ? `to ${instance.name}`
      : "";

const createInstallInput = ({
  category,
  instance,
  item,
}: {
  category: ModrinthCategory;
  instance: SelectedInstance | null;
  item: ModrinthProjectSummary;
}): DownloadModrinthFileInput => {
  if (!item.latestFile) {
    throw new Error("Modrinth did not provide file metadata for this item.");
  }

  if (category !== "modpacks" && !instance) {
    throw new Error("Select an instance before installing this content.");
  }

  return {
    category,
    file: item.latestFile,
    instanceId: instance?.id,
    projectId: item.id,
    projectLogoUrl: item.logoUrl,
    projectName: item.name,
    projectScreenshotUrls: item.screenshotUrls,
    projectSlug: item.slug,
    projectWebsiteUrl: item.websiteUrl,
  };
};

export function useModrinthInstall({
  onContentUpdated,
  onInstanceCreated,
}: UseModrinthInstallOptions = {}) {
  const enqueueDownloadJob = useDownloadQueueStore(
    (state) => state.enqueueDownloadJob,
  );
  const waitForDownloadJob = useDownloadQueueStore(
    (state) => state.waitForDownloadJob,
  );

  const applyContentUpdate = async (content: InstanceContent | null) => {
    if (content && onContentUpdated) {
      await onContentUpdated(content);
    }
  };

  const installDirect = async ({
    category,
    instance,
    item,
  }: {
    category: ModrinthCategory;
    instance: SelectedInstance | null;
    item: ModrinthProjectSummary;
  }) => {
    try {
      const job = await enqueueDownloadJob({
        input: createInstallInput({ category, instance, item }),
        kind: "modrinthFile",
      });
      const finishedJob = await waitForDownloadJob(job.id, {
        timeoutMs: category === "modpacks" ? 60 * 60_000 : 15 * 60_000,
      });
      const result =
        finishedJob.result?.kind === "modrinthFile"
          ? finishedJob.result.result
          : null;

      if (finishedJob.status === "failed" || !result) {
        throw new Error(
          finishedJob.error ?? "Failed to install Modrinth item.",
        );
      }

      await applyContentUpdate(result.content);
      if (result.instance && onInstanceCreated) {
        await onInstanceCreated(result.instance);
      }
      toast.success(
        `${item.name} installed ${getTargetLabel(category, instance)}.`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to install Modrinth item."));
      throw error;
    }
  };

  return {
    install: installDirect,
    installModpack: ({
      category,
      item,
    }: {
      category: Extract<ModrinthCategory, "modpacks">;
      item: ModrinthProjectSummary;
    }) => installDirect({ category, instance: null, item }),
  };
}
