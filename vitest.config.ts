import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// Load .env file for test environment (ensures DATABASE_URL is correct)
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    env: {
      // Ensure DATABASE_URL is loaded from .env, not shell environment
      DATABASE_URL: process.env.DATABASE_URL || "",
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        // Core database layer
        "server/database/**/*.ts",
        "src/core/database/**/*.ts",

        // Modules (business logic)
        "src/modules/**/*.ts",

        // Shared domain models
        "shared/schema.ts",
        "shared/types/**/*.ts",
        "shared/utils/**/*.ts",

        // Tax engine
        "shared/autoTaxEngine/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/__tests__/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/*.d.ts",
        "**/types/**",
        "**/*.config.ts",
        "server/routes*.ts", // Legacy routes (being migrated)
      ],
      // Coverage thresholds for critical paths
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    // Separate test suites
    include: [
      "server/__tests__/**/*.test.ts",
      "src/modules/**/__tests__/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./shared"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
