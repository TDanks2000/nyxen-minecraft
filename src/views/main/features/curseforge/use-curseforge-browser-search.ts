import { useCallback, useEffect, useState } from "react";
import type {
  CurseForgeCategory,
  CurseForgeProjectSummary,
  CurseForgeSortField,
  ModLoader,
} from "@/shared/types";
import { categorySupportsLoaderFilter } from "@/views/main/features/curseforge/curseforge-browser-model";
import { rpc } from "@/views/main/lib/rpc";

type LoaderFilter = Exclude<ModLoader, "vanilla"> | "all";

type UseCurseForgeBrowserSearchInput = {
  category: CurseForgeCategory;
  loader: LoaderFilter;
  minecraftVersion: string | null;
  open: boolean;
  query: string;
  sortField: CurseForgeSortField;
};

type CurseForgeBrowserSearchState = {
  error: string | null;
  loading: boolean;
  projects: Array<CurseForgeProjectSummary>;
  totalCount: number;
};

export function useCurseForgeBrowserSearch({
  category,
  loader,
  minecraftVersion,
  open,
  query,
  sortField,
}: UseCurseForgeBrowserSearchInput): CurseForgeBrowserSearchState & {
  refresh: () => void;
} {
  const [refreshToken, setRefreshToken] = useState(0);
  const [state, setState] = useState<CurseForgeBrowserSearchState>({
    error: null,
    loading: false,
    projects: [],
    totalCount: 0,
  });

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    if (!open) return;
    void refreshToken;

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        error: null,
        loading: true,
      }));

      const normalizedQuery = query.trim();
      const normalizedMinecraftVersion = minecraftVersion?.trim() || undefined;
      const loaderFilter =
        categorySupportsLoaderFilter(category) &&
        loader !== "all" &&
        normalizedMinecraftVersion
          ? loader
          : undefined;

      rpc.requestProxy
        .searchCurseForgeProjects({
          gameVersion: normalizedMinecraftVersion,
          loader: loaderFilter,
          pageSize: 24,
          query: normalizedQuery || undefined,
          section: category,
          sortField,
          sortOrder: sortField === "name" ? "asc" : "desc",
        })
        .then((result) => {
          if (cancelled) return;

          setState({
            error: null,
            loading: false,
            projects: result.data,
            totalCount: result.pagination.totalCount,
          });
        })
        .catch((error: unknown) => {
          if (cancelled) return;

          setState({
            error:
              error instanceof Error
                ? error.message
                : "Failed to load CurseForge projects.",
            loading: false,
            projects: [],
            totalCount: 0,
          });
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    category,
    loader,
    minecraftVersion,
    open,
    query,
    refreshToken,
    sortField,
  ]);

  return {
    ...state,
    refresh,
  };
}
