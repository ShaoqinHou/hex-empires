import { fileURLToPath } from "node:url";

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@hex-empires/kernel": fileURLToPath(new URL("./packages/kernel/src/index.ts", import.meta.url)),
      "@hex-empires/scenario-density": fileURLToPath(
        new URL("./packages/scenario-density/src/index.ts", import.meta.url),
      ),
      "@hex-empires/benchmark-density": fileURLToPath(
        new URL("./packages/benchmark-density/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["packages/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/dist/**"],
  },
});
