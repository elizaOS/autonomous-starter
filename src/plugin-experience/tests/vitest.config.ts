import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./setup.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      "@elizaos/core": path.resolve(__dirname, "../../../../../core/src"),
      "@elizaos/plugin-knowledge": path.resolve(
        __dirname,
        "../../../../../plugin-knowledge/src",
      ),
    },
  },
  esbuild: {
    target: "node18",
  },
});
