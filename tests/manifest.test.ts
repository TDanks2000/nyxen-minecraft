import { describe, expect, test } from "bun:test";

type GeneratedManifest = {
  features: {
    bunTest: boolean;
    electrobun: boolean;
  };
  packageName: string;
  projectName: string;
  testing: string;
};

type PackageJson = {
  name: string;
  scripts: Record<string, string>;
};

const readJson = async <Value>(path: string): Promise<Value> =>
  (await Bun.file(path).json()) as Value;

describe("generated project manifest", () => {
  test("matches the package and enabled testing stack", async () => {
    const [manifest, packageJson] = await Promise.all([
      readJson<GeneratedManifest>("ces.json"),
      readJson<PackageJson>("package.json"),
    ]);

    expect(manifest.projectName).toBe("nyxen-minecraft");
    expect(manifest.packageName).toBe(packageJson.name);
    expect(manifest.testing).toBe("bun");
    expect(manifest.features.bunTest).toBe(true);
    expect(manifest.features.electrobun).toBe(true);
  });

  test("build configuration targets every supported desktop platform", async () => {
    const [config, packageJson] = await Promise.all([
      import("../electrobun.config"),
      readJson<PackageJson>("package.json"),
    ]);

    expect(packageJson.scripts["build:app"]).toContain("electrobun build");
    expect(packageJson.scripts["build:app"]).toContain("--targets=all");
    expect(config.default.build.targets).toBe("all");
  });

  test("cross-platform workflow builds on Windows, macOS, and Linux", async () => {
    const workflow = await Bun.file(
      ".github/workflows/cross-platform.yml",
    ).text();

    expect(workflow).toContain("ubuntu-latest");
    expect(workflow).toContain("macos-latest");
    expect(workflow).toContain("windows-latest");
    expect(workflow).toContain("bun run typecheck");
    expect(workflow).toContain("bun run lint");
    expect(workflow).toContain("bun test");
    expect(workflow).toContain("bun run build");
  });
});
