import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Skip the intentional-slop fixture file (trivial_assertion_only test
    // pattern — kept as a calibration target for slop-cleaner, not a real
    // test suite). Real tests live alongside under src/lib/__tests__/.
    exclude: ["src/lib/__tests__/electricity.test.ts", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/__tests__/**", "src/lib/analytics.ts"],
    },
  },
});
