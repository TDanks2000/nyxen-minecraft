import { describe, expect, test } from "bun:test";
import { toLocalFileUrl } from "../src/views/main/lib/file-url";

describe("renderer file URL helpers", () => {
  test("formats POSIX paths for safe renderer and openExternal use", () => {
    expect(toLocalFileUrl("/home/player/Nyxen Minecraft/logs/latest.log")).toBe(
      "file:///home/player/Nyxen%20Minecraft/logs/latest.log",
    );
  });

  test("formats Windows paths without dropping the drive letter", () => {
    expect(
      toLocalFileUrl(
        String.raw`C:\Users\player\AppData\Local\Nyxen Minecraft\Instances\Pack One`,
      ),
    ).toBe(
      "file:///C:/Users/player/AppData/Local/Nyxen%20Minecraft/Instances/Pack%20One",
    );
  });

  test("escapes URL syntax characters inside local file names", () => {
    expect(toLocalFileUrl("/tmp/Nyxen #1/100% done/latest.log")).toBe(
      "file:///tmp/Nyxen%20%231/100%25%20done/latest.log",
    );
  });
});
