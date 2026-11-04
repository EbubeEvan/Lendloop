import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import shadcn from "eslint-plugin-shadcn";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

const featureBoundaries = {
  settings: {
    "boundaries/elements": [
      { type: "app", pattern: "src/app/**", partialMatch: false },
      {
        type: "feature",
        pattern: "src/features/*",
        capture: ["feature"],
      },
      {
        type: "shared",
        pattern: "src/{components,lib,stores,providers,hooks,config}/**",
        partialMatch: false,
      },
      { type: "convex", pattern: "convex/**", partialMatch: false },
    ],
  },
  plugins: { boundaries },
  rules: {
    "boundaries/dependencies": [
      "error",
      {
        default: "disallow",
        policies: [
          {
            from: { element: { type: "app" } },
            allow: { to: { element: { types: ["feature", "shared", "convex"] } } },
          },
          {
            from: { element: { type: "feature" } },
            allow: { to: { element: { types: ["shared", "convex"] } } },
          },
          {
            from: { element: { type: "feature" } },
            allow: {
              to: {
                element: {
                  type: "feature",
                  captured: { feature: "{{ from.element.captured.feature }}" },
                },
              },
            },
          },
          {
            from: { element: { type: "shared" } },
            allow: { to: { element: { types: ["shared", "convex"] } } },
          },
          {
            from: { element: { type: "convex" } },
            allow: { to: { element: { types: ["convex", "shared"] } } },
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  shadcn.configs["radix-recommended"],
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      boundaries,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      ...featureBoundaries.rules,
    },
    settings: featureBoundaries.settings,
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["convex/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*", "**/src/*"],
              message:
                "Convex code must stay independent of the Next.js app. Put shared backend helpers in convex/lib.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs", "n8n/**/*.json"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "convex/_generated/**",
    "n8n/workflows/**",
    "pnpm-lock.yaml",
  ]),
]);

export default eslintConfig;
