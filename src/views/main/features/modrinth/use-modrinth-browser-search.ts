import { useCallback, useEffect, useState } from "react";
import type {
  ModLoader,
  ModrinthCategory,
  ModrinthProjectSummary,
  ModrinthSortField,
} from "@/shared/types";
import { categorySupportsModrinthLoaderFilter } from "@/views/main/features/modrinth/modrinth-browser-model";
import { rpc } from "@/views/main/lib/rpc";

type LoaderFilter = Exclude<ModLoader, "vanilla"> | "all";

type UseModrinthBrowserSearchInput = {
  category: ModrinthCategory;
  loader: LoaderFilter;
  minecraftVersion: string | null;
  open: boolean;
  query: string;
  sortField: ModrinthSortField;
};

type ModrinthBrowserSearchState = {
  error: string | null;
  loading: boolean;
  projects: Array<ModrinthProjectSummary>;
  totalCount: number;
};

export function useModrinthBrowserSearch({
  category,
  loader,
  minecraftVersion,
  open,
  query,
  sortField,
}: UseModrinthBrowserSearchInput): ModrinthBrowserSearchState & {
  refresh: () => void;
} {
  const [refreshToken, setRefreshToken] = useState(0);
  const [state, setState] = useState<ModrinthBrowserSearchState>({
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
        categorySupportsModrinthLoaderFilter(category) &&
        loader !== "all" &&
        normalizedMinecraftVersion
          ? loader
          : undefined;

      rpc.requestProxy
        .searchModrinthProjects({
          gameVersion: normalizedMinecraftVersion,
          loader: loaderFilter,
          pageSize: 24,
          query: normalizedQuery || undefined,
          section: category,
          sortField,
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
                : "Failed to load Modrinth projects.",
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
