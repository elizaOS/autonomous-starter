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
      "@jitsi/robotjs": path.resolve(__dirname, "./mocks/robotjs.ts"),
    },
  },
  esbuild: {
    target: "node18",
  },
});
