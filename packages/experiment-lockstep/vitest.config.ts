import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@hex-empires/kernel": fileURLToPath(new URL("../kernel/src/index.ts", import.meta.url)),
      "@hex-empires/scenario-hex-turns": fileURLToPath(
        new URL("../scenario-hex-turns/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
