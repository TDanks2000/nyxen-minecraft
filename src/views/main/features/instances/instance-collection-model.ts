import type { InstanceCollectionViewMode } from "@/views/main/features/instances/components/instance-collection-types";

export const LOW_END_INSTANCE_BATCH_SIZE = 24;

export function getPreferredInstanceCollectionViewMode({
  lowEndMode,
  viewModeDefault,
}: {
  lowEndMode: boolean;
  viewModeDefault: InstanceCollectionViewMode;
}): InstanceCollectionViewMode {
  return lowEndMode ? "list" : viewModeDefault;
}

export function getInitialVisibleInstanceLimit({
  batchSize = LOW_END_INSTANCE_BATCH_SIZE,
  lowEndMode,
  totalItems,
}: {
  batchSize?: number;
  lowEndMode: boolean;
  totalItems: number;
}): number {
  if (!lowEndMode) return totalItems;

  return Math.min(totalItems, batchSize);
}

export function getNextVisibleInstanceLimit({
  batchSize = LOW_END_INSTANCE_BATCH_SIZE,
  currentLimit,
  totalItems,
}: {
  batchSize?: number;
  currentLimit: number;
  totalItems: number;
}): number {
  return Math.min(totalItems, currentLimit + batchSize);
}
