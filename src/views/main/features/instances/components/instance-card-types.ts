import type { DownloadQueueJob, LauncherInstance } from "@/shared/types";

export type InstanceActionProps = {
  instance: LauncherInstance;
  launchDisabled: boolean;
  launchLoading: boolean;
  onPlay: () => void;
};

export type InstanceCardDensity = "compact" | "standard";

export type InstanceCardProps = InstanceActionProps & {
  animationsDisabled?: boolean;
  className?: string;
  density?: InstanceCardDensity;
  featured?: boolean;
  installJob?: DownloadQueueJob;
};

export type InstallingInstanceCardProps = {
  animationsDisabled?: boolean;
  className?: string;
  density?: InstanceCardDensity;
  installJob: DownloadQueueJob;
};

export type InstanceCardRenderProps =
  | InstanceCardProps
  | InstallingInstanceCardProps;

export type InstanceListItemProps = InstanceActionProps & {
  animationsDisabled?: boolean;
  className?: string;
  featured?: boolean;
  installJob?: DownloadQueueJob;
};

export type InstanceQuickPlayItemProps = InstanceActionProps & {
  className?: string;
};
