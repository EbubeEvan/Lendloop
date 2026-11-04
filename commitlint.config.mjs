const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "scope-enum": [
      2,
      "always",
      [
        "app",
        "auth",
        "tools",
        "requests",
        "loans",
        "admin",
        "automation",
        "ui",
        "forms",
        "convex",
        "n8n",
        "docs",
        "tooling",
        "deps",
        "ci",
      ],
    ],
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
  },
};

export default config;
