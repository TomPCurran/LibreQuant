import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./lib/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "lib/merge-env-local.ts",
        "lib/jupyter-contents/read.ts",
        "lib/jupyter-contents/write.ts",
        "lib/jupyter-contents/ensure-directory.ts",
        "lib/jupyter-contents/names.ts",
        "lib/jupyter-contents/types.ts",
      ],
      exclude: ["lib/jupyter-contents/**/*.test.ts", "lib/test/**"],
      thresholds: {
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "lib/__vitest-server-only-stub.ts"),
    },
  },
});
