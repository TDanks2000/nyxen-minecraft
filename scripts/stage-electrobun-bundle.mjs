import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const {
  ELECTROBUN_APP_IDENTIFIER,
  ELECTROBUN_APP_NAME,
  ELECTROBUN_APP_VERSION,
  ELECTROBUN_ARCH,
  ELECTROBUN_BUILD_DIR,
  ELECTROBUN_BUILD_ENV,
  ELECTROBUN_OS,
} = process.env;

if (ELECTROBUN_BUILD_ENV !== "stable" || ELECTROBUN_OS !== "linux") {
  process.exit(0);
}

if (
  !ELECTROBUN_APP_NAME ||
  !ELECTROBUN_ARCH ||
  !ELECTROBUN_BUILD_DIR ||
  !ELECTROBUN_OS
) {
  throw new Error("Missing Electrobun build environment for staging.");
}

const source = join(ELECTROBUN_BUILD_DIR, ELECTROBUN_APP_NAME);

if (!existsSync(source)) {
  throw new Error(`Electrobun bundle was not found at ${source}`);
}

const stageRoot = join(
  process.cwd(),
  "dist",
  "electrobun-staged",
  `${ELECTROBUN_OS}-${ELECTROBUN_ARCH}`,
);
const destination = join(stageRoot, basename(source));

rmSync(stageRoot, { force: true, recursive: true });
mkdirSync(stageRoot, { recursive: true });
cpSync(source, destination, { dereference: true, recursive: true });

writeFileSync(
  join(stageRoot, "metadata.json"),
  JSON.stringify(
    {
      appIdentifier: ELECTROBUN_APP_IDENTIFIER,
      appName: ELECTROBUN_APP_NAME,
      appVersion: ELECTROBUN_APP_VERSION,
      arch: ELECTROBUN_ARCH,
      bundlePath: destination,
      os: ELECTROBUN_OS,
    },
    null,
    2,
  ),
);

console.log(`Staged Linux bundle for installers: ${destination}`);
