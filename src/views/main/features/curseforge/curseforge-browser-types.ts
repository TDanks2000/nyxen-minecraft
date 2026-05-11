import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  InstanceContent,
  ModLoader,
  ModrinthCategory,
  ModrinthProjectSummary,
} from "@/shared/types";

export type CurseForgeItem = CurseForgeProjectSummary;
export type ModrinthItem = ModrinthProjectSummary;
export type ContentBrowserSource = "curseforge" | "modrinth";

export type SelectedInstance = {
  id: string;
  name: string;
  minecraftVersion: string;
  loader?: ModLoader;
  iconUrl?: string | null;
  modpackLocked?: boolean;
  modpackName?: string | null;
};

export type InstalledCurseForgeItem = {
  projectId: string;
  fileId?: string;
  fileName?: string;
  slug?: string;
  name: string;
  version?: string;
  category: CurseForgeCategory;
};

export type InstalledContentByCategory = Partial<
  Record<CurseForgeCategory, Array<InstalledCurseForgeItem>>
>;

export type ContentBrowserActionState =
  | "install"
  | "installed"
  | "installing"
  | "managed"
  | "update-available"
  | "incompatible"
  | "failed"
  | "select-instance";

export type CurseForgeBrowserActionState = ContentBrowserActionState;
export type CurseForgeBrowserViewMode = "grid" | "list";

export type CurseForgeBrowserActionParams = {
  category: CurseForgeCategory;
  instance: SelectedInstance;
};

export type CurseForgeInstallParams = CurseForgeBrowserActionParams & {
  item: CurseForgeItem;
};

export type CurseForgeInstallModpackParams = {
  category: Extract<CurseForgeCategory, "modpacks">;
  item: CurseForgeItem;
};

export type CurseForgeManualInstallParams = {
  category: CurseForgeCategory;
  instance: SelectedInstance | null;
  item: CurseForgeItem;
};

export type CurseForgeUninstallParams = CurseForgeBrowserActionParams & {
  item: InstalledCurseForgeItem;
};

export type CurseForgeUpdateParams = CurseForgeBrowserActionParams & {
  installedItem: InstalledCurseForgeItem;
  item: CurseForgeItem;
};

export type ModrinthBrowserActionParams = {
  category: ModrinthCategory;
  instance: SelectedInstance;
};

export type ModrinthInstallParams = ModrinthBrowserActionParams & {
  item: ModrinthItem;
};

export type ModrinthInstallModpackParams = {
  category: Extract<ModrinthCategory, "modpacks">;
  item: ModrinthItem;
};

export type ContentBrowserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSource?: ContentBrowserSource;
  initialCategory?: CurseForgeCategory;
  selectedInstance?: SelectedInstance | null;
  availableInstances?: Array<SelectedInstance>;
  installedContent?: InstalledContentByCategory;
  instanceContent?: InstanceContent | null;
  onSelectInstance?: (instance: SelectedInstance | null) => void;
  onInstall?: (params: CurseForgeInstallParams) => Promise<void> | void;
  onInstallModpack?: (
    params: CurseForgeInstallModpackParams,
  ) => Promise<void> | void;
  onOpenManualDownload?: (
    params: CurseForgeManualInstallParams,
  ) => Promise<void> | void;
  onCompleteManualInstall?: (
    params: CurseForgeManualInstallParams,
  ) => Promise<void> | void;
  onUninstall?: (params: CurseForgeUninstallParams) => Promise<void> | void;
  onUpdate?: (params: CurseForgeUpdateParams) => Promise<void> | void;
  onOpenDetails?: (item: CurseForgeItem, category: CurseForgeCategory) => void;
  onInstallModrinth?: (params: ModrinthInstallParams) => Promise<void> | void;
  onInstallModrinthModpack?: (
    params: ModrinthInstallModpackParams,
  ) => Promise<void> | void;
  onOpenModrinthDetails?: (
    item: ModrinthItem,
    category: ModrinthCategory,
  ) => void;
};

export type CurseForgeBrowserDialogProps = ContentBrowserDialogProps;
