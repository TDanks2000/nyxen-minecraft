import type { ElectrobunConfig } from "electrobun";
import { APP_IDENTIFIER, APP_NAME } from "./src/shared/constants";

export default {
  app: {
    identifier: APP_IDENTIFIER,
    name: APP_NAME,
    version: "0.1.0",
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    targets: "all",
    copy: {
      ".electrobun/views/main": "views/main",
    },
    watch: ["src/bun", "src/shared", ".electrobun/views/main"],
  },
} satisfies ElectrobunConfig;
