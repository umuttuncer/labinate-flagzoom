import { defineConfig } from "vitest/config";

// Tests run in plain Node (no DOM emulation). tests/setup.ts replaces every
// network primitive with a stub that throws, so a test can never send a real
// analytics request — each test must mock fetch/sendBeacon explicitly.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
