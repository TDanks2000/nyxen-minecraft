import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    identifier: "dev.electrobun.nyxenminecraft",
    name: "Nyxen Minecraft",
    version: "0.1.0",
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    copy: {
      ".electrobun/views/main": "views/main",
    },
    watch: ["src/bun", "src/shared", ".electrobun/views/main"],
  },
} satisfies ElectrobunConfig;
