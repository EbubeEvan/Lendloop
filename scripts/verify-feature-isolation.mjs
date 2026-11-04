#!/usr/bin/env node
/**
 * Static guard for the "modular monolith" promise: every feature must be
 * reachable through its public `index.ts`, and no feature may import another
 * feature's internals.
 *
 * This complements eslint-plugin-boundaries (which catches the same rules at
 * lint time) with a report that is easy to run in CI and easy to read.
 *
 * Usage: node scripts/verify-feature-isolation.mjs
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const FEATURES_DIR = join(ROOT, "src/features");

const errors = [];
const warnings = [];

function fail(file, message) {
  errors.push(`${relative(ROOT, file)}: ${message}`);
}

function warn(file, message) {
  warnings.push(`${relative(ROOT, file)}: ${message}`);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(path);
    }
  }
  return files;
}

function specifiers(source) {
  const found = new Set();
  const pattern = /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    found.add(match[1]);
  }
  return [...found];
}

const featureEntries = (await readdir(FEATURES_DIR, { withFileTypes: true })).filter((entry) =>
  entry.isDirectory(),
);
const features = featureEntries.map((entry) => entry.name);

// The navigation registry is the documented deletion point for a feature.
const navigation = await readFile(join(ROOT, "src/config/navigation.ts"), "utf8");
const registry = navigation.slice(
  navigation.indexOf("export const FEATURES"),
  navigation.indexOf("} as const", navigation.indexOf("export const FEATURES")),
);

for (const feature of features) {
  const directory = join(FEATURES_DIR, feature);

  const indexPath = join(directory, "index.ts");
  try {
    const index = await readFile(indexPath, "utf8");
    if (!/export\s/.test(index)) {
      fail(indexPath, "the public entry point exports nothing.");
    }
  } catch {
    fail(directory, "missing the public entry point index.ts.");
  }

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name !== "index.ts") {
      fail(
        join(directory, entry.name),
        "feature files must live in a subfolder so internal structure can change freely.",
      );
    }
  }

  if (!new RegExp(`\\b${feature}:\\s*(true|false)`).test(registry)) {
    warn(directory, `feature "${feature}" is not registered in src/config/navigation.ts.`);
  }
}

for (const file of await walk(join(ROOT, "src"))) {
  const source = await readFile(file, "utf8");
  const inside = relative(FEATURES_DIR, file);
  const owner = inside.startsWith("..") ? null : inside.split(/[\\/]/)[0];

  for (const specifier of specifiers(source)) {
    if (specifier === "@/features") {
      fail(file, "import a specific feature entry point, not the features barrel.");
      continue;
    }

    if (!specifier.startsWith("@/features/")) {
      continue;
    }

    const [, , name, ...rest] = specifier.split("/");

    if (!features.includes(name)) {
      fail(file, `imports unknown feature "${name}".`);
      continue;
    }

    if (owner === name) {
      if (rest.length > 0) {
        warn(file, `use a relative import inside "${name}" instead of "${specifier}".`);
      }
      continue;
    }

    if (rest.length > 0) {
      fail(
        file,
        `deep-imports "${specifier}". Use "@/features/${name}" (the public entry point) instead.`,
      );
    } else if (owner !== null) {
      fail(
        file,
        `feature "${owner}" imports feature "${name}" directly. Features must stay independent; ` +
          "compose them in src/app or move the shared piece into src/components.",
      );
    }
  }
}

// Feature roots are the only allowed entry point, so a page must be able to
// drop a feature by deleting one folder and one route.
for (const feature of features) {
  try {
    const info = await stat(join(FEATURES_DIR, feature, "index.ts"));
    if (!info.isFile()) {
      fail(join(FEATURES_DIR, feature), "index.ts is not a file.");
    }
  } catch {
    // Already reported above.
  }
}

for (const message of warnings) {
  console.warn(`warning  ${message}`);
}

if (errors.length > 0) {
  for (const message of errors) {
    console.error(`error    ${message}`);
  }
  console.error(`\n${errors.length} isolation problem(s) found.`);
  process.exit(1);
}

console.log(
  `Feature isolation OK — ${features.length} features checked, ${warnings.length} warning(s).`,
);
