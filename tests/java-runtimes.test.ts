import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  test("times out hung Java version probes", () => {
    if (process.platform === "win32") {
      return;
    }

    const directory = mkdtempSync(join(tmpdir(), "nyxen-java-probe-"));
    const executable = join(directory, "java");

    try {
      writeFileSync(executable, "#!/bin/sh\nsleep 2\n");
      chmodSync(executable, 0o755);

      const startedAt = performance.now();
      const detected = detectInstalledJavaRuntime(executable, {
        timeoutMs: 25,
      });
      const elapsedMs = performance.now() - startedAt;

      expect(elapsedMs).toBeLessThan(1_000);
      expect(detected).toMatchObject({
        error: "Java version probe timed out after 1 second.",
        executable,
        majorVersion: null,
        version: null,
      });
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
