import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const packageJson = await Bun.file(join(root, "package.json")).json();
const version = normalizeDebianVersion(packageJson.version);
const packageName = "nyxen-minecraft";
const productName = "Nyxen Minecraft";
const executableName = "nyxen-minecraft";
const bundleName = "NyxenMinecraft";
const artifactDir = join(root, "artifacts");
const installerWorkDir = join(root, "dist", "linux-installers");
const toolCacheDir = join(root, "dist", "installer-tools");
const stagedBundle = findStagedLinuxBundle();

rmSync(installerWorkDir, { force: true, recursive: true });
mkdirSync(artifactDir, { recursive: true });
mkdirSync(installerWorkDir, { recursive: true });
mkdirSync(toolCacheDir, { recursive: true });

const debPath = createDeb();
const appImagePath = createAppImage();

console.log(`Created Linux installer assets:
- ${debPath}
- ${appImagePath}`);

function findStagedLinuxBundle() {
  const candidates = [
    join(root, "dist", "electrobun-staged", "linux-x64", bundleName),
    join(root, "dist", "electrobun-staged", "linux-arm64", bundleName),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "bin", "launcher"))) {
      return candidate;
    }
  }

  throw new Error(
    "No staged Linux Electrobun bundle found. Run `bun run build:release` on Linux first.",
  );
}

function createDeb() {
  const debRoot = join(installerWorkDir, "deb-root");
  const appRoot = join(debRoot, "opt", packageName);
  const binDir = join(debRoot, "usr", "bin");
  const desktopPath = join(
    debRoot,
    "usr",
    "share",
    "applications",
    `${packageName}.desktop`,
  );
  const iconPath = join(
    debRoot,
    "usr",
    "share",
    "icons",
    "hicolor",
    "512x512",
    "apps",
    `${packageName}.png`,
  );
  const controlPath = join(debRoot, "DEBIAN", "control");

  mkdirSync(dirname(controlPath), { recursive: true });
  mkdirSync(binDir, { recursive: true });
  mkdirSync(dirname(desktopPath), { recursive: true });
  mkdirSync(dirname(iconPath), { recursive: true });

  cpSync(stagedBundle, appRoot, { dereference: true, recursive: true });
  cpSync(join(root, "assets", "icon.png"), iconPath);
  symlinkSync(`/opt/${packageName}/bin/launcher`, join(binDir, executableName));
  writeFileSync(desktopPath, desktopEntry(`/usr/bin/${executableName}`));
  writeFileSync(
    controlPath,
    [
      `Package: ${packageName}`,
      `Version: ${version}`,
      "Section: games",
      "Priority: optional",
      "Architecture: amd64",
      "Maintainer: TDanks <tdanks2000@users.noreply.github.com>",
      "Depends: libgtk-3-0, libwebkit2gtk-4.1-0, libayatana-appindicator3-1",
      `Description: ${productName}`,
      " Desktop launcher for managing Minecraft instances, modpacks, and profiles.",
      "",
    ].join("\n"),
  );

  normalizePackagePermissions(debRoot);
  run("find", [
    join(appRoot, "bin"),
    "-type",
    "f",
    "-exec",
    "chmod",
    "755",
    "{}",
    "+",
  ]);

  const outputPath = join(artifactDir, `${packageName}_${version}_amd64.deb`);
  run("dpkg-deb", ["--build", "--root-owner-group", debRoot, outputPath]);
  return outputPath;
}

function createAppImage() {
  const appDir = join(installerWorkDir, `${packageName}.AppDir`);
  const appRoot = join(appDir, "usr", "lib", packageName);
  const desktopPath = join(appDir, `${packageName}.desktop`);
  const iconPath = join(appDir, `${packageName}.png`);
  const appRunPath = join(appDir, "AppRun");
  const appImageTool = join(toolCacheDir, "appimagetool-x86_64.AppImage");
  const outputPath = join(
    artifactDir,
    `${packageName}-${version}-x86_64.AppImage`,
  );

  mkdirSync(appRoot, { recursive: true });
  cpSync(stagedBundle, appRoot, { dereference: true, recursive: true });
  cpSync(join(root, "assets", "icon.png"), iconPath);
  writeFileSync(desktopPath, desktopEntry(`${packageName}`));
  writeFileSync(
    appRunPath,
    [
      "#!/usr/bin/env sh",
      'HERE="$(dirname "$(readlink -f "$0")")"',
      `exec "$HERE/usr/lib/${packageName}/bin/launcher" "$@"`,
      "",
    ].join("\n"),
  );
  chmodSync(appRunPath, 0o755);
  normalizePackagePermissions(appDir);
  chmodSync(appRunPath, 0o755);
  run("find", [
    join(appRoot, "bin"),
    "-type",
    "f",
    "-exec",
    "chmod",
    "755",
    "{}",
    "+",
  ]);

  if (!existsSync(appImageTool)) {
    run("curl", [
      "-fsSL",
      "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage",
      "-o",
      appImageTool,
    ]);
    chmodSync(appImageTool, 0o755);
  }

  run(appImageTool, [appDir, outputPath], {
    ARCH: "x86_64",
    APPIMAGE_EXTRACT_AND_RUN: "1",
  });
  return outputPath;
}

function desktopEntry(execValue) {
  return [
    "[Desktop Entry]",
    "Version=1.0",
    "Type=Application",
    `Name=${productName}`,
    `Comment=${productName} launcher`,
    `Exec=${execValue}`,
    `Icon=${packageName}`,
    "Terminal=false",
    `StartupWMClass=${productName}`,
    "Categories=Game;",
    "",
  ].join("\n");
}

function normalizeDebianVersion(value) {
  return String(value).replace(/[^0-9A-Za-z.+:~-]/g, "-");
}

function normalizePackagePermissions(path) {
  run("find", [path, "-type", "d", "-exec", "chmod", "755", "{}", "+"]);
  run("find", [path, "-type", "f", "-exec", "chmod", "644", "{}", "+"]);
}

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}
