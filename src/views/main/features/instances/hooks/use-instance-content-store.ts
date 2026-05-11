import { create } from "zustand";
import type { InstanceContent } from "@/shared/types";
import { rpc } from "@/views/main/lib/rpc";

type InstanceContentStore = {
  byInstanceId: Record<string, InstanceContent>;
  generation: number;
  errors: Record<string, string>;
  loadingIds: Record<string, boolean>;
  loadPromises: Record<string, Promise<InstanceContent> | undefined>;
  clearAllContent: () => void;
  clearInstanceContent: (instanceId: string) => void;
  refreshInstanceContent: (instanceId: string) => Promise<InstanceContent>;
  refreshManyInstanceContents: (
    instanceIds: Array<string>,
  ) => Promise<Array<InstanceContent>>;
  replaceContent: (content: InstanceContent) => void;
};

const withoutKey = <T>(record: Record<string, T>, key: string) => {
  const next = { ...record };
  delete next[key];
  return next;
};

export const useInstanceContentStore = create<InstanceContentStore>(
  (set, get) => ({
    byInstanceId: {},
    generation: 0,
    errors: {},
    loadingIds: {},
    loadPromises: {},
    clearAllContent: () => {
      set((state) => ({
        byInstanceId: {},
        errors: {},
        generation: state.generation + 1,
        loadingIds: {},
        loadPromises: {},
      }));
    },
    clearInstanceContent: (instanceId) => {
      set((state) => ({
        byInstanceId: withoutKey(state.byInstanceId, instanceId),
        errors: withoutKey(state.errors, instanceId),
        loadingIds: withoutKey(state.loadingIds, instanceId),
        loadPromises: withoutKey(state.loadPromises, instanceId),
      }));
    },
    refreshInstanceContent: async (instanceId) => {
      const existingLoad = get().loadPromises[instanceId];

      if (existingLoad) {
        return existingLoad;
      }

      set((state) => ({
        loadingIds: { ...state.loadingIds, [instanceId]: true },
      }));

      const generation = get().generation;
      const loadPromise = rpc.requestProxy
        .getInstanceContent({ instanceId })
        .then((content) => {
          if (get().generation !== generation) {
            return content;
          }

          set((state) => ({
            byInstanceId: {
              ...state.byInstanceId,
              [instanceId]: content,
            },
            errors: withoutKey(state.errors, instanceId),
            loadingIds: {
              ...state.loadingIds,
              [instanceId]: false,
            },
          }));
          return content;
        })
        .catch((e: unknown) => {
          const message =
            e instanceof Error ? e.message : "Failed to load instance content";
          if (get().generation !== generation) {
            throw e;
          }

          set((state) => ({
            errors: {
              ...state.errors,
              [instanceId]: message,
            },
            loadingIds: {
              ...state.loadingIds,
              [instanceId]: false,
            },
          }));
          throw e;
        })
        .finally(() => {
          if (
            get().generation === generation &&
            get().loadPromises[instanceId] === loadPromise
          ) {
            set((state) => ({
              loadPromises: withoutKey(state.loadPromises, instanceId),
            }));
          }
        });

      set((state) => ({
        loadPromises: {
          ...state.loadPromises,
          [instanceId]: loadPromise,
        },
      }));
      return loadPromise;
    },
    refreshManyInstanceContents: async (instanceIds) => {
      const uniqueIds = [...new Set(instanceIds)];
      const results = await Promise.all(
        uniqueIds.map((instanceId) =>
          get()
            .refreshInstanceContent(instanceId)
            .catch(() => null),
        ),
      );

      return results.filter((content): content is InstanceContent =>
        Boolean(content),
      );
    },
    replaceContent: (content) => {
      set((state) => ({
        byInstanceId: {
          ...state.byInstanceId,
          [content.instanceId]: content,
        },
        errors: withoutKey(state.errors, content.instanceId),
        loadingIds: {
          ...state.loadingIds,
          [content.instanceId]: false,
        },
      }));
    },
  }),
);
