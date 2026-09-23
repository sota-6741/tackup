import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [
            "src/**/*.db.test.ts",
            "src/**/*.storage.test.ts",
            "src/**/*.gcs.test.ts",
          ],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          globalSetup: ["./vitest.db-global-setup.ts"],
          setupFiles: ["./vitest.db-setup.ts"],
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: "storage",
          environment: "node",
          include: ["src/**/*.storage.test.ts"],
          globalSetup: ["./vitest.storage-global-setup.ts"],
          setupFiles: ["./vitest.storage-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "gcs",
          environment: "node",
          include: ["src/**/*.gcs.test.ts"],
        },
      },
    ],
  },
});
