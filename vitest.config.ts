import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    globalSetupTimeout: 180_000,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
