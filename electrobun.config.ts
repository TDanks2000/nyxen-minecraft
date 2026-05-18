import type { ElectrobunConfig } from "electrobun";
import { APP_IDENTIFIER, APP_NAME } from "./src/shared/constants";

const packageJson = (await Bun.file(
  new URL("./package.json", import.meta.url),
).json()) as { version: string };

export default {
  app: {
    identifier: APP_IDENTIFIER,
    name: APP_NAME,
    version: packageJson.version,
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
      define: {
        "process.env.NYXEN_MICROSOFT_CLIENT_ID": JSON.stringify(
          process.env.NYXEN_MICROSOFT_CLIENT_ID ?? "",
        ),
        "Bun.env.NYXEN_CURSEFORGE_API_KEY": JSON.stringify(
          Bun.env.NYXEN_CURSEFORGE_API_KEY ?? "",
        ),
        "Bun.env.CURSEFORGE_API_KEY": JSON.stringify(
          Bun.env.CURSEFORGE_API_KEY ?? "",
        ),
      },
    },
    mac: {
      icons: "assets/icon.iconset",
    },
    win: {
      icon: "assets/icon.ico",
    },
    linux: {
      icon: "assets/icon.png",
    },
    targets: "all",
    copy: {
      ".electrobun/views/main": "views/main",
    },
    watch: ["src/bun", "src/shared", ".electrobun/views/main"],
  },
  scripts: {
    postBuild: "scripts/stage-electrobun-bundle.mjs",
  },
  release: {
    generatePatch: false,
  },
} satisfies ElectrobunConfig;
