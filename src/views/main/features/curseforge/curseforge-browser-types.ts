import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  ModLoader,
} from "@/shared/types";

export type CurseForgeItem = CurseForgeProjectSummary;

export type SelectedInstance = {
  id: string;
  name: string;
  minecraftVersion: string;
  loader?: ModLoader;
  iconUrl?: string | null;
};

export type InstalledCurseForgeItem = {
  projectId: string;
  fileId?: string;
  slug?: string;
  name: string;
  version?: string;
  category: CurseForgeCategory;
};

export type InstalledContentByCategory = Partial<
  Record<CurseForgeCategory, Array<InstalledCurseForgeItem>>
>;

export type CurseForgeBrowserActionState =
  | "install"
  | "installed"
  | "installing"
  | "update-available"
  | "incompatible"
  | "failed"
  | "select-instance";

export type CurseForgeBrowserViewMode = "grid" | "list";

export type CurseForgeBrowserActionParams = {
  category: CurseForgeCategory;
  instance: SelectedInstance;
};

export type CurseForgeInstallParams = CurseForgeBrowserActionParams & {
  item: CurseForgeItem;
};

export type CurseForgeUninstallParams = CurseForgeBrowserActionParams & {
  item: InstalledCurseForgeItem;
};

export type CurseForgeUpdateParams = CurseForgeBrowserActionParams & {
  installedItem: InstalledCurseForgeItem;
  item: CurseForgeItem;
};

export type CurseForgeBrowserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: CurseForgeCategory;
  selectedInstance?: SelectedInstance | null;
  availableInstances?: Array<SelectedInstance>;
  installedContent?: InstalledContentByCategory;
  onSelectInstance?: (instance: SelectedInstance) => void;
  onInstall?: (params: CurseForgeInstallParams) => Promise<void> | void;
  onUninstall?: (params: CurseForgeUninstallParams) => Promise<void> | void;
  onUpdate?: (params: CurseForgeUpdateParams) => Promise<void> | void;
  onOpenDetails?: (item: CurseForgeItem, category: CurseForgeCategory) => void;
};
