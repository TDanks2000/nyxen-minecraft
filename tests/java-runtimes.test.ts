import { describe, expect, test } from "bun:test";
import {
  detectInstalledJavaRuntime,
  parseJavaRuntimeVersion,
} from "../src/bun/launcher/java-runtimes";

describe("java runtime detection", () => {
  test("parses modern OpenJDK version output", () => {
    expect(
      parseJavaRuntimeVersion(
        'openjdk version "21.0.2" 2024-01-16\nOpenJDK Runtime Environment',
      ),
    ).toEqual({
      majorVersion: 21,
      version: "21.0.2",
    });
  });

  test("parses legacy Java 8 version output", () => {
    expect(
      parseJavaRuntimeVersion(
        'java version "1.8.0_392"\nJava(TM) SE Runtime Environment',
      ),
    ).toEqual({
      majorVersion: 8,
      version: "1.8.0_392",
    });
  });

  test("detects installed Java metadata from a probe result", () => {
    const detected = detectInstalledJavaRuntime("/opt/java/bin/java", {
      runner: (executable) => ({
        error: null,
        status: 0,
        stderr: 'openjdk version "17.0.10" 2024-01-16',
        stdout: `using ${executable}`,
      }),
    });

    expect(detected).toMatchObject({
      error: null,
      executable: "/opt/java/bin/java",
      majorVersion: 17,
      version: "17.0.10",
    });
    expect(detected.output).toContain("/opt/java/bin/java");
  });

  test("reports probe failures without throwing", () => {
    expect(
      detectInstalledJavaRuntime("/missing/java", {
        runner: () => ({
          error: { message: "ENOENT" },
          status: null,
          stderr: "",
          stdout: "",
        }),
      }),
    ).toMatchObject({
      error: "ENOENT",
      executable: "/missing/java",
      majorVersion: null,
      version: null,
    });
  });
});
