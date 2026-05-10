import type { InstanceContent, LauncherInstance } from "@/shared/types";

export type ModManagementState = {
  controlsDisabled: boolean;
  managedByModpack: boolean;
  reason: "loading" | "modpack" | null;
};

export const getModManagementState = ({
  content,
  contentLoading,
  instance,
}: {
  content: InstanceContent | null;
  contentLoading: boolean;
  instance: LauncherInstance | null;
}): ModManagementState => {
  const managedByModpack =
    (instance?.modpack?.locked ?? false) ||
    Boolean(content?.curseForge.modpacks?.length);

  if (managedByModpack) {
    return {
      controlsDisabled: true,
      managedByModpack: true,
      reason: "modpack",
    };
  }

  if (contentLoading || !content) {
    return {
      controlsDisabled: true,
      managedByModpack: false,
      reason: "loading",
    };
  }

  return {
    controlsDisabled: false,
    managedByModpack: false,
    reason: null,
  };
};
