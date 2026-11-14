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

// EXACT-PAGE rules: UNPO-541 (docs journey restructure, phase 1) page moves.
// No old path is a prefix-collision risk: each is matched with a terminator.
const EXACT_RULES = [
  ["/get-started/quickstart", "/home/quickstart"],
  ["/guides/understanding-telephony", "/telephony/concepts/understanding-telephony"],
  ["/core-engine/calling-engine", "/telephony/concepts/calling-engine"],
  ["/core-engine/channels", "/telephony/concepts/channels"],
  ["/platform/dev-platform/security-and-compliance", "/telephony/concepts/security-and-compliance"],
  ["/get-started/realtime", "/telephony/streaming/unpod-speech-quickstart"],
  ["/speech-stack/websocket", "/telephony/streaming/websocket"],
  ["/speech-stack/introduction", "/agent-sdk/overview"],
  ["/speech-stack/setup-checklist", "/agent-sdk/setup-checklist"],
  ["/get-started/first-phone-call", "/agent-sdk/quickstart"],
  ["/speech-stack/bring-your-agent", "/agent-sdk/bring-your-agent"],
  ["/speech-stack/adapters", "/agent-sdk/adapters"],
  ["/speech-stack/agent-settings", "/agent-sdk/agent-settings"],
  ["/speech-stack/agent-tools", "/agent-sdk/agent-tools"],
  ["/speech-stack/voice-profiles", "/agent-sdk/voice-profiles"],
  ["/speech-stack/domain-dictionaries", "/agent-sdk/domain-dictionaries"],
  ["/speech-stack/pipes", "/agent-sdk/pipes"],
  ["/speech-stack/agent-runner", "/agent-sdk/agent-runner"],
  ["/speech-stack/call-lifecycle", "/agent-sdk/call-lifecycle"],
  ["/speech-stack/outbound-calls", "/agent-sdk/outbound-calls"],
  ["/speech-stack/recordings-transcripts", "/agent-sdk/recordings-transcripts"],
  ["/speech-stack/deploy", "/agent-sdk/deploy"],
  ["/core-engine/models-router", "/agent-sdk/models-router"],
  ["/platform/dev-platform/load-testing", "/agent-sdk/load-testing"],
  ["/playbook/playground", "/agent-studio/playground"],
  ["/get-started/phone", "/agent-studio/quickstart"],
  ["/playbook/what-is-a-playbook", "/agent-studio/what-is-a-playbook"],
  ["/playbook/build-an-agent", "/agent-studio/build-an-agent"],
  ["/playbook/test-by-voice", "/agent-studio/test-by-voice"],
  ["/playbook/optimize", "/agent-studio/optimize"],
  ["/playbook/publish-and-share", "/agent-studio/publish-and-share"],
  ["/playbook/library", "/agent-studio/library"],
  ["/playbook/developer-setup", "/agent-studio/developer-setup"],
  ["/playbook/api", "/agent-studio/api"],
  ["/core-engine/flows-journeys", "/agent-studio/flows-journeys"],
  ["/core-engine/actions", "/agent-studio/actions"],
  ["/core-engine/agent-workforce", "/agent-studio/agent-workforce"],
  ["/core-engine/agent-harness", "/agent-studio/agent-harness"],
  ["/core-engine/context-engine", "/context/overview"],
  ["/core-engine/entities", "/context/entities"],
  ["/core-engine/conversations", "/context/conversations"],
  ["/core-engine/outcomes", "/context/outcomes"],
  ["/core-engine/intelligence", "/context/intelligence"],
  ["/core-engine/teams-policies", "/context/teams-policies"],
  ["/apps/overview", "/platform/apps/overview"],
  ["/apps/contact-center", "/platform/apps/contact-center"],
  ["/apps/personal-assistant", "/platform/apps/personal-assistant"],
  ["/apps/email-first-agent", "/platform/apps/email-first-agent"],
];

// PREFIX rules, longest "from" first.
const PREFIX_RULES = [];

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
  ".worktrees",
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
