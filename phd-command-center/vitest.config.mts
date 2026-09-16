import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * `.mts` rather than `.ts`: Vite's native config loader treats a `.ts` config as CommonJS unless
 * the package is a module, and warns that this will become the default. Path aliases come from
 * tsconfig natively, so the vite-tsconfig-paths plugin is no longer needed.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    clearMocks: true,
  },
});
