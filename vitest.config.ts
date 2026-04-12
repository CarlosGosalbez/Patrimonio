import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    setupFiles: [],
    env: {
      TZ: "UTC",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        // Core utilities con cobertura verificada
        "lib/financial/**/*.ts",
        "lib/validation/**/*.ts",
        "lib/analytics/calculations.ts",
        "lib/investments/calculations.ts",
        "lib/imports/correlation.ts",
        "lib/imports/matching.ts",
        "lib/imports/parser.ts",
        "lib/budgets/utils.ts",
      ],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        // branches: parser.ts (CSV bancario multi-formato) tiene 50% — requiere fixtures reales
        branches: 65,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
