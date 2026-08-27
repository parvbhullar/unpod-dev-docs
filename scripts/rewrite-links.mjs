#!/usr/bin/env node
// Rewrites internal doc links to match the new directory structure.
//
// Two rule tiers (applied in order: all EXACT rules first, then PREFIX rules):
//   EXACT-PAGE rules - bare paths like /quickstart, /platform. Rewritten only
//     when followed by a terminating delimiter, so /platform does not corrupt
//     /platform/onboarding and /quickstart output is not re-corrupted by the
//     later /platform rule.
//   PREFIX rules - old directory prefixes (end with "/"). Plain prefix swap on
//     link-start contexts ("(" or quote), safe because the old directories are
//     distinct prefixes.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// EXACT-PAGE rules, longest "from" first.
const EXACT_RULES = [
  ["/Voice%20AI/introduction", "/platform/onboarding"],
  ["/Voice AI/introduction", "/platform/onboarding"],
  ["/why-unpod/vs-competition", "/get-started/vs-competition"],
  ["/why-unpod/introduction", "/get-started/why-unpod"],
  ["/why-unpod/how-it-works", "/get-started/how-it-works"],
  ["/speech/quickstart", "/get-started/first-phone-call"],
  ["/core-components", "/get-started/core-concepts"],
  ["/configuration", "/platform/self-hosting/configuration"],
  ["/architecture", "/platform/self-hosting/architecture"],
  ["/introduction", "/platform/introduction"],
  ["/quickstart", "/platform/self-hosting/quickstart"],
  ["/platform", "/platform/introduction"],
  ["/home", "/get-started/why-unpod"],
];

// PREFIX rules, longest "from" first.
const PREFIX_RULES = [
  ["/SuperDialog/Embedding%20Guides/", "/superdialog/embedding-guides/"],
  ["/SuperDialog/Embedding Guides/", "/superdialog/embedding-guides/"],
  ["/Voice%20AI/Space%20View/", "/platform/space-view/"],
  ["/Voice AI/Space View/", "/platform/space-view/"],
  ["/Voice%20AI/Studio%20View/", "/platform/studio-view/"],
  ["/Voice AI/Studio View/", "/platform/studio-view/"],
  ["/Dev%20Platform/", "/platform/dev-platform/"],
  ["/Dev Platform/", "/platform/dev-platform/"],
  ["/SuperDialog/", "/superdialog/"],
  ["/speech/", "/speech-stack/"],
  ["/sdk/", "/speech-stack/"],
];

// EXACT: replace only when followed by a terminating delimiter, in a
// link-start context ("(", '"' or "'").
const exactMatchers = EXACT_RULES.map(([from, to]) => ({
  re: new RegExp("([(\"'])" + escapeRegExp(from) + "(?=[)\"'#?\\s])", "g"),
  to,
}));

// PREFIX: plain prefix swap on link-start contexts.
const prefixMatchers = PREFIX_RULES.map(([from, to]) => ({
  re: new RegExp("([(\"'])" + escapeRegExp(from), "g"),
  to,
}));

function rewrite(text) {
  let out = text;
  let count = 0;
  for (const { re, to } of [...exactMatchers, ...prefixMatchers]) {
    out = out.replace(re, (_match, delim) => {
      count++;
      return delim + to;
    });
  }
  return { out, count };
}

const SKIP = new Set([
  "node_modules",
  ".git",
  "docs",
  "scripts",
  "images",
  "logo",
  ".claude",
]);

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP.has(name)) walk(full);
    } else if (name.endsWith(".mdx")) {
      files.push(full);
    }
  }
}
walk(ROOT);

let totalFiles = 0;
let totalReplacements = 0;
for (const file of files.sort()) {
  const text = readFileSync(file, "utf8");
  const { out, count } = rewrite(text);
  if (count > 0) {
    writeFileSync(file, out);
    totalFiles++;
    totalReplacements += count;
    console.log(`${relative(ROOT, file)}: ${count}`);
  }
}
console.log(
  `\nDone: ${totalReplacements} replacement(s) across ${totalFiles} file(s).`,
);
