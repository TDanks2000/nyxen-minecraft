import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function vendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;

  const normalizedId = id.replaceAll("\\", "/");

  if (
    normalizedId.includes("/node_modules/react/") ||
    normalizedId.includes("/node_modules/react-dom/") ||
    normalizedId.includes("/node_modules/scheduler/")
  ) {
    return "vendor-react";
  }

  if (normalizedId.includes("/@tanstack/react-router/")) {
    return "vendor-router";
  }

  if (
    normalizedId.includes("/@base-ui/") ||
    normalizedId.includes("/cmdk/") ||
    normalizedId.includes("/embla-carousel-react/") ||
    normalizedId.includes("/input-otp/") ||
    normalizedId.includes("/react-day-picker/") ||
    normalizedId.includes("/react-resizable-panels/") ||
    normalizedId.includes("/vaul/")
  ) {
    return "vendor-ui";
  }

  if (
    normalizedId.includes("/recharts/") ||
    normalizedId.includes("/d3-") ||
    normalizedId.includes("/victory-vendor/")
  ) {
    return "vendor-charts";
  }

  if (normalizedId.includes("/lucide-react/")) {
    return "vendor-icons";
  }

  if (normalizedId.includes("/date-fns/")) {
    return "vendor-date";
  }

  if (normalizedId.includes("/electrobun/")) {
    return "vendor-electrobun";
  }

  return "vendor";
}

export default defineConfig({
  base: "./",
  build: {
    emptyOutDir: true,
    outDir: "../../../.electrobun/views/main",
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      generatedRouteTree: "./routeTree.gen.ts",
      quoteStyle: "double",
      routesDirectory: "./routes",
      semicolons: true,
      target: "react",
    }),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  root: "src/views/main",
});
