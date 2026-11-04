import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "tests/convex/**/*.test.ts"],
          setupFiles: ["tests/setup-node.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["tests/ui/**/*.test.tsx"],
          setupFiles: ["tests/setup-dom.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["convex/**/*.ts", "src/**/*.{ts,tsx}"],
      exclude: ["convex/_generated/**", "src/components/ui/**"],
    },
  },
});
