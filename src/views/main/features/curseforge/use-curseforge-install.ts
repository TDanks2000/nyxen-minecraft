import { toast } from "sonner";
import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  DownloadCurseForgeFileInput,
  InstanceContent,
  LauncherInstance,
} from "@/shared/types";
import { getCurseForgeExpectedFileName } from "@/views/main/features/curseforge/curseforge-browser-model";
import type {
  CurseForgeInstallModpackParams,
  CurseForgeInstallParams,
  CurseForgeManualInstallParams,
  CurseForgeUpdateParams,
  SelectedInstance,
} from "@/views/main/features/curseforge/curseforge-browser-types";
import { useDownloadQueueStore } from "@/views/main/features/downloads/download-queue-store";
import { rpc } from "@/views/main/lib/rpc";

type UseCurseForgeInstallOptions = {
  onContentUpdated?: (content: InstanceContent) => Promise<void> | void;
  onInstanceCreated?: (instance: LauncherInstance) => Promise<void> | void;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getTargetLabel = (
  category: CurseForgeCategory,
  instance: SelectedInstance | null,
): string =>
  category === "modpacks"
    ? "as a new instance"
    : instance
      ? `to ${instance.name}`
      : "";

const getManualDownloadUrl = (
  item: CurseForgeProjectSummary,
): string | null => {
  if (!item.websiteUrl) return null;

  const baseUrl = item.websiteUrl.replace(/\/+$/, "");
  const fileId = item.latestFile?.id;

  return fileId ? `${baseUrl}/files/${fileId}` : baseUrl;
};

const createInstallInput = ({
  category,
  instance,
  item,
}: {
  category: CurseForgeCategory;
  instance: SelectedInstance | null;
  item: CurseForgeProjectSummary;
}): DownloadCurseForgeFileInput => {
  if (!item.latestFile) {
    throw new Error("CurseForge did not provide file metadata for this item.");
  }

  if (category !== "modpacks" && !instance) {
    throw new Error("Select an instance before installing this content.");
  }

  return {
    category,
    file: item.latestFile,
    instanceId: instance?.id,
    projectLogoUrl: item.logoUrl,
    projectId: item.id,
    projectName: item.name,
    projectScreenshotUrls: item.screenshotUrls,
    projectSlug: item.slug,
    projectWebsiteUrl: item.websiteUrl,
  };
};

export function useCurseForgeInstall({
  onContentUpdated,
  onInstanceCreated,
}: UseCurseForgeInstallOptions = {}) {
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
    category: CurseForgeCategory;
    instance: SelectedInstance | null;
    item: CurseForgeProjectSummary;
  }) => {
    try {
      const job = await enqueueDownloadJob({
        input: createInstallInput({ category, instance, item }),
        kind: "curseForgeFile",
      });
      const finishedJob = await waitForDownloadJob(job.id, {
        timeoutMs: category === "modpacks" ? 60 * 60_000 : 15 * 60_000,
      });
      const result =
        finishedJob.result?.kind === "curseForgeFile"
          ? finishedJob.result.result
          : null;

      if (finishedJob.status === "failed" || !result) {
        throw new Error(
          finishedJob.error ?? "Failed to install CurseForge item.",
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
      toast.error(getErrorMessage(error, "Failed to install CurseForge item."));
      throw error;
    }
  };

  const openManualDownload = async ({
    item,
  }: CurseForgeManualInstallParams) => {
    const url = getManualDownloadUrl(item);
    const fileName = getCurseForgeExpectedFileName(item) ?? "the file";

    if (!url) {
      const error = new Error("CurseForge did not provide a project page.");
      toast.error(error.message);
      throw error;
    }

    try {
      const result = await rpc.requestProxy.openExternal({ url });

      if (!result.opened) {
        throw new Error("Could not open the CurseForge download page.");
      }

      toast.message(`Download ${fileName} to Downloads, then scan Downloads.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not open CurseForge."));
      throw error;
    }
  };

  const completeManualInstall = async ({
    category,
    instance,
    item,
  }: CurseForgeManualInstallParams) => {
    try {
      const result = await rpc.requestProxy.installDownloadedCurseForgeFile(
        createInstallInput({ category, instance, item }),
      );

      await applyContentUpdate(result.content);
      if (result.instance && onInstanceCreated) {
        await onInstanceCreated(result.instance);
      }
      toast.success(
        `${item.name} installed ${getTargetLabel(category, instance)}.`,
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Could not find the downloaded CurseForge file.",
        ),
      );
      throw error;
    }
  };

  return {
    completeManualInstall,
    install: ({ category, instance, item }: CurseForgeInstallParams) =>
      installDirect({ category, instance, item }),
    installModpack: ({ category, item }: CurseForgeInstallModpackParams) =>
      installDirect({ category, instance: null, item }),
    openManualDownload,
    update: ({ category, instance, item }: CurseForgeUpdateParams) =>
      installDirect({ category, instance, item }),
  };
}
