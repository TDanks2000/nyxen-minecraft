import { describe, expect, test } from "bun:test";
import {
  getInitialVisibleInstanceLimit,
  getNextVisibleInstanceLimit,
  getPreferredInstanceCollectionViewMode,
  LOW_END_INSTANCE_BATCH_SIZE,
} from "../src/views/main/features/instances/instance-collection-model";

describe("instance collection model", () => {
  test("keeps the requested view mode outside low-end mode", () => {
    expect(
      getPreferredInstanceCollectionViewMode({
        lowEndMode: false,
        viewModeDefault: "grid",
      }),
    ).toBe("grid");
  });

  test("prefers list view in low-end mode", () => {
    expect(
      getPreferredInstanceCollectionViewMode({
        lowEndMode: true,
        viewModeDefault: "grid",
      }),
    ).toBe("list");
  });

  test("renders full collections outside low-end mode", () => {
    expect(
      getInitialVisibleInstanceLimit({
        lowEndMode: false,
        totalItems: LOW_END_INSTANCE_BATCH_SIZE * 3,
      }),
    ).toBe(LOW_END_INSTANCE_BATCH_SIZE * 3);
  });

  test("batches visible rows in low-end mode", () => {
    expect(
      getInitialVisibleInstanceLimit({
        lowEndMode: true,
        totalItems: LOW_END_INSTANCE_BATCH_SIZE * 3,
      }),
    ).toBe(LOW_END_INSTANCE_BATCH_SIZE);

    expect(
      getNextVisibleInstanceLimit({
        currentLimit: LOW_END_INSTANCE_BATCH_SIZE,
        totalItems: LOW_END_INSTANCE_BATCH_SIZE * 3,
      }),
    ).toBe(LOW_END_INSTANCE_BATCH_SIZE * 2);
  });

  test("never shows more rows than exist", () => {
    expect(
      getInitialVisibleInstanceLimit({
        lowEndMode: true,
        totalItems: 5,
      }),
    ).toBe(5);

    expect(
      getNextVisibleInstanceLimit({
        currentLimit: LOW_END_INSTANCE_BATCH_SIZE,
        totalItems: LOW_END_INSTANCE_BATCH_SIZE + 2,
      }),
    ).toBe(LOW_END_INSTANCE_BATCH_SIZE + 2);
  });
});
