# Unpod Docs Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure unpod-dev-docs into the approved 5-tab ICP-first IA (Get Started · Speech Stack · SuperDialog · Platform · API Reference) and rewrite the core-path pages.

**Architecture:** Three phases. Phase 1 builds the skeleton: a validation script, deletions, `git mv` into new directories, and a new `docs.json`. Phase 2 rewrites the core-path (★) pages, lifting every code sample from working source in `unpod-sdk` and `superdialog`. Phase 3 sweeps naming, dedups concept definitions, and runs a cold-read review. A shrinking allowlist (`scripts/docs-allowlist.txt`) tracks files kept only as source material; it must be empty at the end.

**Tech Stack:** Mintlify (`docs.json` navigation, MDX pages), Node for validation scripts, `npx mint broken-links` for link checking.

**Design doc:** `docs/plans/2026-06-05-docs-restructure-design.md` (read it first).

**Working rules:**
- Work directly on branch `main-superdialog` in `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-dev-docs`. NO worktree, NO new branch (explicit user instruction).
- Source repos (read-only): `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk`, `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/superdialog`.
- Never write code samples freehand. Lift them from `unpod-sdk/examples/`, `unpod-sdk/docs/`, `superdialog/examples/`, or verify every identifier against `unpod-sdk/src/unpod/__init__.py` / `superdialog/src/superdialog/__init__.py`.
- Naming discipline (use everywhere): "Unpod" = platform/company · "Speech Stack" = voice infra + unpod-sdk · "SuperDialog" = dialog framework · "Platform" = hosted UI + self-hosting.
- Canonical GitHub URL everywhere: `https://github.com/unpod-ai/unpod`.
- After every task: run `node scripts/check-docs.mjs`, expect exit 0, then commit.

---

## Phase 1: Skeleton

### Task 1: Validation script (the test harness for this work)

**Files:**
- Create: `scripts/check-docs.mjs`
- Create: `scripts/docs-allowlist.txt`

**Step 1: Write the validation script**

Create `scripts/check-docs.mjs`:

```js
#!/usr/bin/env node
// Validates docs.json navigation against files on disk.
// Fails on: pages referenced in docs.json that don't exist; .mdx files on
// disk that are neither in navigation nor in scripts/docs-allowlist.txt.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const docs = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));

const pages = [];
function collect(node) {
  if (typeof node === "string") { pages.push(node); return; }
  if (Array.isArray(node)) { node.forEach(collect); return; }
  if (node && typeof node === "object") {
    if (node.pages) collect(node.pages);
    if (node.groups) collect(node.groups);
    if (node.tabs) collect(node.tabs);
  }
}
collect(docs.navigation);

const missing = pages.filter((p) => !existsSync(join(ROOT, `${p}.mdx`)));

const allowlistPath = join(ROOT, "scripts", "docs-allowlist.txt");
const allowlist = existsSync(allowlistPath)
  ? readFileSync(allowlistPath, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
  : [];

const SKIP = new Set(["node_modules", ".git", "snippets", "docs", "scripts", "images", "logo", ".claude"]);
const onDisk = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (!SKIP.has(name)) walk(full); }
    else if (name.endsWith(".mdx")) onDisk.push(relative(ROOT, full).replace(/\.mdx$/, ""));
  }
}
walk(ROOT);

const referenced = new Set(pages);
const orphans = onDisk.filter((f) => !referenced.has(f) && !allowlist.includes(f));
const staleAllow = allowlist.filter((f) => !existsSync(join(ROOT, `${f}.mdx`)));

if (missing.length) console.error("MISSING (in docs.json, not on disk):\n  " + missing.join("\n  "));
if (orphans.length) console.error("ORPHANS (on disk, not in nav or allowlist):\n  " + orphans.join("\n  "));
if (staleAllow.length) console.error("STALE ALLOWLIST (file no longer exists):\n  " + staleAllow.join("\n  "));
if (allowlist.length) console.warn(`note: ${allowlist.length} file(s) on allowlist pending absorption`);
if (missing.length || orphans.length || staleAllow.length) process.exit(1);
console.log(`OK: ${pages.length} nav pages, 0 missing, 0 unexplained orphans.`);
```

**Step 2: Create an empty allowlist**

```bash
touch scripts/docs-allowlist.txt
```

**Step 3: Run it — expect FAIL (this is the failing test)**

```bash
cd /Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-dev-docs
node scripts/check-docs.mjs
```

Expected: exit 1 with ~26 ORPHANS listed (essentials/*, ai-tools/*, api/overview, api/rate-limiting, development, index, core-components, etc.). If the orphan list differs wildly from the design doc's inventory, stop and investigate before deleting anything.

**Step 4: Commit**

```bash
git add scripts/check-docs.mjs scripts/docs-allowlist.txt
git commit -m "chore(docs): add docs.json validation script"
```

### Task 2: Delete boilerplate and dead orphans

**Files:**
- Delete: `essentials/` (all 6 files), `development.mdx`, `index.mdx`, `snippets/snippet-intro.mdx`, `blog/index.mdx`, `Voice AI/Space View/edit.mdx`, `Voice AI/Space View/space token.mdx`
- Delete (dead api duplicates — each must appear in Task 1's orphan output before deleting): `api/authentication.mdx`, `api/calls.mdx`, `api/messages.mdx`, `api/numbers.mdx`, `api/billing&usage/analytics.mdx`, `api/billing&usage/billing.mdx`, `api/execution/runs.mdx`, `api/execution/tasks.mdx`, `api/logs/calls.mdx`, `api/provider/configurations.mdx`, `api/space/spaces.mdx`, `api/telephony/Providers.mdx`, `api/telephony/bridges.mdx`

**Step 1: Cross-check each file against the orphan list from Task 1.** Any file NOT in the orphan output is referenced in nav — do not delete it; stop and re-check.

**Step 2: Delete**

```bash
git rm -r essentials
git rm development.mdx index.mdx snippets/snippet-intro.mdx blog/index.mdx
git rm "Voice AI/Space View/edit.mdx" "Voice AI/Space View/space token.mdx"
git rm api/authentication.mdx api/calls.mdx api/messages.mdx api/numbers.mdx \
  "api/billing&usage/analytics.mdx" "api/billing&usage/billing.mdx" \
  api/execution/runs.mdx api/execution/tasks.mdx api/logs/calls.mdx \
  api/provider/configurations.mdx api/space/spaces.mdx \
  api/telephony/Providers.mdx api/telephony/bridges.mdx
```

**Step 3: Commit**

```bash
git commit -m "chore(docs): delete Mintlify boilerplate and dead orphan pages"
```

### Task 3: Merge `speech/` + `sdk/` into `speech-stack/`

**Step 1: Move files**

```bash
mkdir speech-stack
git mv speech/introduction.mdx speech/voice-profiles.mdx speech/pipes.mdx \
  speech/numbers.mdx speech/websocket.mdx speech/superdialog-integration.mdx \
  speech/call-lifecycle.mdx speech/outbound-calls.mdx speech/telephony-states.mdx \
  speech/sdk-setup.mdx speech/session-controls.mdx speech/hooks-events.mdx \
  speech-stack/
git mv sdk/bring-your-agent.mdx sdk/setup-checklist.mdx speech-stack/
mkdir -p get-started
git mv speech/quickstart.mdx get-started/first-phone-call.mdx
rmdir speech sdk
```

**Step 2: Verify** — `ls speech-stack` shows 14 files; `speech/` and `sdk/` are gone.

**Step 3: Commit**

```bash
git commit -m "refactor(docs): merge speech/ and sdk/ into speech-stack/"
```

### Task 4: Rename `SuperDialog/` → `superdialog/`, kebab-case embedding guides

macOS is case-insensitive: rename via a temp name.

**Step 1: Move**

```bash
git mv SuperDialog superdialog-tmp
git mv superdialog-tmp superdialog
git mv "superdialog/Embedding Guides" superdialog/embedding-guides
```

**Step 2: Verify** — `git status` shows renames only; `ls superdialog/embedding-guides` shows 7 files.

**Step 3: Commit**

```bash
git commit -m "refactor(docs): rename SuperDialog/ to superdialog/, kebab-case embedding guides"
```

### Task 5: Build `platform/` (Voice AI, Dev Platform, self-hosting, root pages)

**Step 1: Move and kebab-case**

```bash
mkdir -p platform/self-hosting
git mv "Voice AI/Space View" platform/space-view
git mv "Voice AI/Studio View" platform/studio-view
git mv "platform/studio-view/voice profile.mdx" platform/studio-view/voice-profile.mdx
git mv "platform/studio-view/knowledge base.mdx" platform/studio-view/knowledge-base.mdx
git mv "platform/studio-view/call logs.mdx" platform/studio-view/call-logs.mdx
git mv "platform/studio-view/api key.mdx" platform/studio-view/api-key.mdx
git mv "Voice AI/introduction.mdx" platform/onboarding.mdx
git mv "Voice AI/Register.mdx" platform/register.mdx
git mv "Voice AI/Voice AI Agents Use Case.mdx" platform/use-cases.mdx
rmdir "Voice AI"
git mv "Dev Platform" platform/dev-platform
git mv platform/dev-platform/Analytics-and-Reporting.mdx platform/dev-platform/analytics-and-reporting.mdx
git mv platform/dev-platform/Load-Testing.mdx platform/dev-platform/load-testing.mdx
git mv "platform/dev-platform/Security-&-Compliance.mdx" platform/dev-platform/security-and-compliance.mdx
git mv quickstart.mdx platform/self-hosting/quickstart.mdx
git mv configuration.mdx platform/self-hosting/configuration.mdx
git mv architecture.mdx platform/self-hosting/architecture.mdx
git mv platform.mdx platform/introduction.mdx
```

Note: `git mv platform.mdx platform/introduction.mdx` must run AFTER `mkdir -p platform` succeeded (a file and directory named `platform` cannot coexist — that's why the directory is created first and the file moved last; if `mkdir` failed earlier, move the file to a temp name first).

**Step 2: Verify** — `ls platform` shows: `introduction.mdx onboarding.mdx register.mdx use-cases.mdx dev-platform/ space-view/ studio-view/ self-hosting/`.

**Step 3: Commit**

```bash
git commit -m "refactor(docs): consolidate Voice AI, Dev Platform, self-hosting under platform/"
```

### Task 6: Build `get-started/`

**Step 1: Move**

```bash
git mv why-unpod/introduction.mdx get-started/why-unpod.mdx
git mv why-unpod/vs-competition.mdx get-started/vs-competition.mdx
git mv why-unpod/how-it-works.mdx get-started/how-it-works.mdx
git mv core-components.mdx get-started/core-concepts.mdx
rmdir why-unpod
```

(`get-started/first-phone-call.mdx` already moved in Task 3.)

**Step 2: Commit**

```bash
git commit -m "refactor(docs): create get-started/ from why-unpod and core-components"
```

### Task 7: Rewrite internal links for the new paths

**Files:**
- Create: `scripts/rewrite-links.mjs` (run once, keep for phase 2)

**Step 1: Write the link rewriter**

```js
#!/usr/bin/env node
// One-shot: rewrites internal doc links after the phase-1 moves.
// Ordered longest-prefix-first so specific rules win.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MAP = [
  ["/speech/quickstart", "/get-started/first-phone-call"],
  ["/speech/", "/speech-stack/"],
  ["/sdk/", "/speech-stack/"],
  ["/SuperDialog/Embedding%20Guides/", "/superdialog/embedding-guides/"],
  ["/SuperDialog/Embedding Guides/", "/superdialog/embedding-guides/"],
  ["/SuperDialog/", "/superdialog/"],
  ["/why-unpod/introduction", "/get-started/why-unpod"],
  ["/why-unpod/vs-competition", "/get-started/vs-competition"],
  ["/why-unpod/how-it-works", "/get-started/how-it-works"],
  ["/core-components", "/get-started/core-concepts"],
  ["/Voice%20AI/Space%20View/", "/platform/space-view/"],
  ["/Voice AI/Space View/", "/platform/space-view/"],
  ["/Voice%20AI/Studio%20View/", "/platform/studio-view/"],
  ["/Voice AI/Studio View/", "/platform/studio-view/"],
  ["/Voice%20AI/introduction", "/platform/onboarding"],
  ["/Voice AI/introduction", "/platform/onboarding"],
  ["/Dev%20Platform/", "/platform/dev-platform/"],
  ["/Dev Platform/", "/platform/dev-platform/"],
  ["/quickstart", "/platform/self-hosting/quickstart"],
  ["/configuration", "/platform/self-hosting/configuration"],
  ["/architecture", "/platform/self-hosting/architecture"],
  ["/platform", "/platform/introduction"],
  ["/home", "/get-started/why-unpod"],
];

const SKIP = new Set(["node_modules", ".git", "docs", "scripts", "images", "logo", ".claude"]);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (!SKIP.has(name)) walk(full, out); }
    else if (name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let text = readFileSync(file, "utf8");
  const before = text;
  for (const [from, to] of MAP) {
    // Only rewrite link targets: occurrences preceded by '(' or '"'.
    text = text.split(`(${from}`).join(`(${to}`);
    text = text.split(`"${from}`).join(`"${to}`);
  }
  if (text !== before) { writeFileSync(file, text); changed++; }
}
console.log(`rewrote links in ${changed} file(s)`);
```

Caveats the engineer must know:
- `/quickstart`, `/platform`, `/configuration`, `/architecture` are prefixes of their own replacements. The MAP is applied in order, and the earlier `/speech/quickstart` rule already consumed the only ambiguous case; after `/quickstart` → `/platform/self-hosting/quickstart` runs, the later `/platform` rule would corrupt it. **Fix before running:** move the `/platform` rule ABOVE `/quickstart` and make it exact-ish: use `["/platform)", "/platform/introduction)"]` and `["/platform\"", "/platform/introduction\""]` style pairs instead of the bare prefix. Verify the final MAP against `grep -rn "(/platform" --include="*.mdx" .` output before running.

**Step 2: Dry-run grep first** — know what you're changing:

```bash
grep -rln --include="*.mdx" -e "(/speech/" -e "(/sdk/" -e "(/SuperDialog" -e "(/why-unpod" -e "(/Voice" -e "(/Dev" . | head -50
```

**Step 3: Run the rewriter**

```bash
node scripts/rewrite-links.mjs
```

**Step 4: Spot-check** — `git diff` a few files; confirm no double-rewrites like `/platform/self-hosting/platform/introduction`.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(docs): rewrite internal links for new directory structure"
```

### Task 8: New `docs.json` (5 tabs) + allowlist

**Files:**
- Modify: `docs.json` (replace the `navigation`, `navbar.links[0].href`, `footer.socials.github`, and `redirects` sections)
- Modify: `scripts/docs-allowlist.txt`

**Step 1: Replace `navigation.tabs` with exactly this** (keep `$schema`, `theme`, `name`, `icons`, `colors`, `favicon`, `logo` unchanged):

```json
"tabs": [
  {
    "tab": "Get Started",
    "groups": [
      {
        "group": "Start Here",
        "icon": "rocket",
        "pages": [
          "get-started/why-unpod",
          "get-started/vs-competition",
          "get-started/how-it-works",
          "get-started/first-phone-call",
          "get-started/core-concepts"
        ]
      },
      {
        "group": "AI Tools",
        "icon": "sparkles",
        "pages": [
          "ai-tools/claude-code",
          "ai-tools/cursor",
          "ai-tools/windsurf"
        ]
      }
    ]
  },
  {
    "tab": "Speech Stack",
    "groups": [
      {
        "group": "Overview",
        "icon": "book-open",
        "pages": [
          "speech-stack/introduction"
        ]
      },
      {
        "group": "Your Agent",
        "icon": "bot",
        "pages": [
          "speech-stack/bring-your-agent",
          "speech-stack/superdialog-integration"
        ]
      },
      {
        "group": "Telephony",
        "icon": "phone",
        "pages": [
          "speech-stack/numbers",
          "speech-stack/voice-profiles",
          "speech-stack/pipes",
          "speech-stack/outbound-calls",
          "speech-stack/call-lifecycle",
          "speech-stack/telephony-states"
        ]
      },
      {
        "group": "Runtime",
        "icon": "activity",
        "pages": [
          "speech-stack/sdk-setup",
          "speech-stack/session-controls",
          "speech-stack/hooks-events",
          "speech-stack/websocket"
        ]
      },
      {
        "group": "Going to Production",
        "icon": "rocket",
        "pages": [
          "speech-stack/setup-checklist"
        ]
      }
    ]
  },
  {
    "tab": "SuperDialog",
    "groups": [
      {
        "group": "Getting Started",
        "icon": "book-open",
        "pages": [
          "superdialog/introduction",
          "superdialog/quickstart",
          "superdialog/thinking-in-flows"
        ]
      },
      {
        "group": "Core Concepts",
        "icon": "layers",
        "pages": [
          "superdialog/architecture",
          "superdialog/flows",
          "superdialog/tools",
          "superdialog/sessions"
        ]
      },
      {
        "group": "Reference",
        "icon": "code",
        "pages": [
          "superdialog/api-reference",
          "superdialog/cli"
        ]
      },
      {
        "group": "Embedding Guides",
        "icon": "plug",
        "pages": [
          "superdialog/embedding-guides/overview",
          "superdialog/embedding-guides/unpod-voice",
          "superdialog/embedding-guides/cli",
          "superdialog/embedding-guides/livekit",
          "superdialog/embedding-guides/pipecat",
          "superdialog/embedding-guides/fastapi",
          "superdialog/embedding-guides/testing"
        ]
      }
    ]
  },
  {
    "tab": "Platform",
    "groups": [
      {
        "group": "Overview",
        "icon": "book-open",
        "pages": [
          "platform/introduction",
          "platform/onboarding",
          "platform/register",
          "platform/use-cases"
        ]
      },
      {
        "group": "Space View",
        "icon": "grid-2x2",
        "pages": [
          "platform/space-view/introduction",
          "platform/space-view/conversation",
          "platform/space-view/calls",
          "platform/space-view/people",
          "platform/space-view/analytics"
        ]
      },
      {
        "group": "Studio View",
        "icon": "layout-panel-left",
        "pages": [
          "platform/studio-view/dashboard",
          {
            "group": "Agents",
            "pages": [
              "platform/studio-view/identity",
              "platform/studio-view/persona",
              "platform/studio-view/voice-profile",
              "platform/studio-view/telephony",
              "platform/studio-view/advance",
              "platform/studio-view/analysis",
              "platform/studio-view/integration"
            ]
          },
          "platform/studio-view/knowledge-base",
          "platform/studio-view/call-logs",
          "platform/studio-view/api-key"
        ]
      },
      {
        "group": "Dev Platform",
        "icon": "sliders-horizontal",
        "pages": [
          "platform/dev-platform/introduction",
          "platform/dev-platform/register",
          "platform/dev-platform/login",
          "platform/dev-platform/telephony",
          "platform/dev-platform/numbers",
          "platform/dev-platform/provider",
          "platform/dev-platform/agents",
          "platform/dev-platform/analytics-and-reporting",
          "platform/dev-platform/load-testing",
          "platform/dev-platform/security-and-compliance"
        ]
      },
      {
        "group": "Self-Hosting",
        "icon": "server",
        "pages": [
          "platform/self-hosting/quickstart",
          "platform/self-hosting/configuration",
          "platform/self-hosting/architecture"
        ]
      }
    ]
  },
  {
    "tab": "API Reference",
    "groups": [
      {
        "group": "Getting Started",
        "icon": "book-open",
        "pages": [
          "api/get-started/quickstart",
          "api/get-started/authentication"
        ]
      },
      {
        "group": "API Lists",
        "pages": [
          "<<UNCHANGED: copy the entire current API Lists group verbatim from the existing docs.json>>"
        ]
      }
    ]
  }
]
```

The `API Lists` group is copied verbatim from the current `docs.json` (the `api/...` paths did not move).

**Step 2: Update the rest of docs.json**

- `navbar.links[0].href` → `https://github.com/unpod-ai/unpod`
- `footer.socials.github` → `https://github.com/unpod-ai/unpod`
- `redirects` → `[{ "source": "/", "destination": "/get-started/why-unpod" }]`

**Step 3: Set the allowlist** — `scripts/docs-allowlist.txt`:

```
home
introduction
api/overview
api/rate-limiting
blog/getting-started-with-unpod-api
blog/building-voice-ai-agent
blog/self-hosting-unpod
blog/understanding-telephony
blog/webhook-integration
```

**Step 4: Run validation — expect PASS**

```bash
node scripts/check-docs.mjs
```

Expected: `OK: ... nav pages, 0 missing, 0 unexplained orphans.` with a 9-file allowlist warning. If MISSING pages are listed, a `git mv` in Tasks 3–6 diverged from this nav — fix the mismatch.

**Step 5: Link check**

```bash
npx mint broken-links
```

(Fallback if `mint` is unavailable: `npx mintlify broken-links`.) Expected: no broken links. Fix any stragglers the rewriter missed.

**Step 6: Commit**

```bash
git add docs.json scripts/docs-allowlist.txt
git commit -m "feat(docs): new 5-tab ICP-first navigation"
```

---

## Phase 2: Core path rewrite

Page-writing rules for every task in this phase:
- Frontmatter: `title`, `description`, and `icon` consistent with neighbors.
- Voice: second person, active, concrete. No marketing fluff outside Why Unpod.
- Every code block must trace to a file in `unpod-sdk/` or `superdialog/` — note the source file in an MDX comment above the block: `{/* source: unpod-sdk/examples/browser_agent.py */}`.
- Concepts are LINKED to `/get-started/core-concepts`, never re-defined.
- After each task: `node scripts/check-docs.mjs` && `npx mint broken-links` && commit.

### Task 9: `get-started/core-concepts.mdx` (rewrite) — DO THIS FIRST

Everything else links to it.

**Sources to read first:**
- Current `get-started/core-concepts.mdx` (old core-components content — has the data-flow diagram)
- `platform/self-hosting/architecture.mdx` (four-pillars framing)
- `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/docs/00-overview.md` (Management vs Connectivity split)
- `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/docs/05-quickstart.md` (resource chain: profile → pipe → trunk → number)
- `get-started/how-it-works.mdx` (absorb its useful diagrams/flow)

**Required structure:**
1. One architecture diagram (mermaid): Caller → Number → Trunk → Bridge → Pipe → (STT/TTS infra) → WebSocket → AgentRunner → your Agent/Brain, with SuperDialog shown as an optional brain.
2. Glossary, one canonical definition each: Number, Trunk, Voice Profile, Pipe, Bridge, Agent (Brain), AgentRunner, Session, Space. Each entry: 1–3 sentences + link to its Speech Stack page.
3. "Two APIs" section: Management API (REST, provisioning) vs Connectivity API (WSS, live calls) — when each is used.
4. "IDs you'll meet" callout: `agent_id` vs `pipe_id` vs space token vs runner agent ID — what each identifies, where it comes from. (Resolves a known support pain.)
5. Naming note: the four product terms (Unpod, Speech Stack, SuperDialog, Platform).

**Steps:** read sources → write page → delete `get-started/how-it-works.mdx` and remove it from docs.json nav → run checks → commit `feat(docs): rewrite core concepts as single source of truth`.

### Task 10: `get-started/quickstart.mdx` (new — browser-first)

**Sources:**
- `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/docs/06-browser-quickstart.md`
- `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/examples/browser_agent.py`
- `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/examples/browser_playground/README.md`

**Required structure:**
1. Promise up front: "Talk to your own voice agent in the browser in about 5 minutes. No phone number needed."
2. Prereqs: Python 3.12+, an Unpod API key (link where to get one), `pip install unpod` (or `uv add unpod` — match what unpod-sdk's README actually instructs).
3. Environment: state the base URLs ONCE — `UNPOD_SERVICE_BASE_URL`, `UNPOD_ORCHESTRATOR_BASE_URL`, defaults for the hosted platform. This is the only page that explains them; other pages link here.
4. The agent: a single ~20-line script lifted from `browser_agent.py`, using the SIMPLEST brain available (direct LLM adapter — verify which adapter the example actually uses; do NOT introduce SuperDialog here).
5. Run + talk: exact command, what the user sees, link to the browser playground for a richer local-dev setup.
6. Next steps: → `/get-started/first-phone-call`, → `/speech-stack/bring-your-agent`.

**Steps:** read sources → verify every import in the code sample against `unpod-sdk/src/unpod/__init__.py` → write page → add `"get-started/quickstart"` to docs.json Start Here group, right after `get-started/why-unpod` → checks → commit `feat(docs): add browser-first quickstart`.

### Task 11: `get-started/first-phone-call.mdx` (rewrite)

**Sources:** current file content (old speech/quickstart), `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/docs/05-quickstart.md`, `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/examples/full_agent_setup.py`.

**Required structure:** opens with "You built the browser agent in the Quickstart — now give it a phone number." Continues the SAME code: voice profile → pipe → trunk → number attach → answer a real call → (optional) make an outbound call. Each provisioning step shows the Management API call lifted from `full_agent_setup.py`. Ends linking to `/speech-stack/setup-checklist` and `/speech-stack/outbound-calls`.

**Steps:** read sources → rewrite → checks → commit `feat(docs): rewrite first-phone-call as quickstart continuation`.

### Task 12: `get-started/why-unpod.mdx` (rewrite) + absorb home/vs-competition

**Sources:** current `get-started/why-unpod.mdx`, `get-started/vs-competition.mdx`, root `home.mdx`, root `introduction.mdx`.

**Required structure:** the "80% of voice-agent effort is speech infrastructure, not AI" problem → what Unpod handles vs what you write (table) → a compact "vs alternatives" section (from vs-competition) → CTA cards: Quickstart / SuperDialog / Platform. One page.

**Steps:** rewrite → `git rm get-started/vs-competition.mdx home.mdx introduction.mdx` → remove `get-started/vs-competition` from nav → remove `home` and `introduction` from allowlist → checks → commit `feat(docs): rewrite why-unpod as single positioning page`.

### Task 13: `get-started/choose-your-path.mdx` (new)

Router page, 4 cards: "I have an existing agent" → `/speech-stack/bring-your-agent` · "I want structured dialog flows" → `/superdialog/introduction` · "I don't want to write code" → `/platform/introduction` · "I want to self-host" → `/platform/self-hosting/quickstart`.

**Steps:** write → add `"get-started/choose-your-path"` to nav after core-concepts → checks → commit `feat(docs): add choose-your-path router`.

### Task 14: `speech-stack/bring-your-agent.mdx` (rewrite, promoted)

**Sources:** current file (good bones — adapter patterns), `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/docs/04-adapters.md`, `unpod-sdk/src/unpod/adapters/*.py`.

**Required additions over current content:**
- Opens as THE entry point for devs with an existing agent.
- A prominent "streaming is the hot path" section: implement `.stream()`, not just `.turn()` — explain the audio-latency consequence (known P0).
- Per-adapter subsections (LangChain, OpenAI, Anthropic, HTTP, MCP, custom `DialogAdapter`) with code verified against the adapter sources.

**Steps:** rewrite → checks → commit `feat(docs): promote and rewrite bring-your-agent`.

### Task 15: `speech-stack/adapters.mdx` (new reference)

**Sources:** `unpod-sdk/docs/04-adapters.md`, `unpod-sdk/src/unpod/adapters/base.py` (the `DialogAdapter` protocol).

**Content:** the `DialogAdapter` protocol (turn/stream/assist signatures), auto-wrapping rules (what types AgentRunner accepts and what it wraps them into), adapter comparison table, error surfaces. Reference style, not tutorial.

**Steps:** write → add `"speech-stack/adapters"` to nav after bring-your-agent → checks → commit `feat(docs): add adapters reference`.

### Task 16: `speech-stack/agent-runner.mdx` (merge sdk-setup + session-controls)

**Sources:** `speech-stack/sdk-setup.mdx`, `speech-stack/session-controls.mdx`, `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/unpod-sdk/docs/03-connectivity-sdk.md`.

**Content:** AgentRunner lifecycle (register → dispatch → session), Session object (controls: say/transfer/merge/end; properties), CallContext. One page replaces two.

**Steps:** write merged page → `git rm speech-stack/sdk-setup.mdx speech-stack/session-controls.mdx` → update nav (Runtime group: `speech-stack/agent-runner` first) → checks → commit `feat(docs): merge runner and session docs into agent-runner`.

### Task 17: `speech-stack/level-up-superdialog.mdx` (absorb superdialog-integration)

**Sources:** `speech-stack/superdialog-integration.mdx`, `unpod-sdk/src/unpod/adapters/superdialog.py`.

**Content:** when a plain LLM brain stops being enough (multi-step flows, tool orchestration, handoffs) → `SuperDialogAdapter` wiring code → link into `/superdialog/introduction`. Short bridge page.

**Steps:** write → `git rm speech-stack/superdialog-integration.mdx` → update nav (Your Agent group: replace `superdialog-integration` with `level-up-superdialog`) → checks → commit `feat(docs): add level-up-to-superdialog bridge page`.

### Task 18: `speech-stack/call-lifecycle.mdx` (merge telephony-states, add state diagram)

**Sources:** `speech-stack/call-lifecycle.mdx`, `speech-stack/telephony-states.mdx`, `unpod-sdk/src/unpod/models/call.py` (the actual status enum — diagram must match the code).

**Content:** one page: lifecycle narrative + mermaid `stateDiagram-v2` of call states (pending → ringing → active → completed/failed/no-answer — verify exact states from the model), webhook/polling guidance.

**Steps:** merge → `git rm speech-stack/telephony-states.mdx` → update nav → checks → commit `feat(docs): merge call lifecycle and states with state diagram`.

### Task 19: Production pages (4 short pages, one task)

**Create:**
- `speech-stack/trunks.mdx` — from `unpod-sdk/docs/02-management-sdk.md` trunks section + `src/unpod/management/trunks.py` (LiveKit vs BYO trunk)
- `speech-stack/recordings-transcripts.mdx` — from management docs + `recordings.py`/`transcripts.py`
- `speech-stack/observability.mdx` — from `connectivity/metrics.py` + hooks docs (CallMetrics, TokenUsage, CostBreakdown)
- `speech-stack/deploy.mdx` — from `docs/03-connectivity-sdk.md` deployment notes (long-running runner, reconnection, scaling)

Each: short reference page (~60–100 lines), code verified against source.

**Steps:** write all 4 → nav: Telephony group gains `trunks` (after pipes); Runtime gains `observability` (after hooks-events); Going to Production becomes `setup-checklist`, `deploy`, `recordings-transcripts` → checks → commit `feat(docs): add trunks, observability, deploy, recordings pages`.

### Task 20: `api/overview.mdx` (rewrite, into nav) + absorb stragglers

**Sources:** current `api/overview.mdx`, `api/rate-limiting.mdx`, `blog/getting-started-with-unpod-api.mdx`.

**Content:** base URL(s) stated once, auth (bearer pattern, link to authentication page), rate limits, pagination conventions, error shape, SDK cross-link ("prefer Python? → Speech Stack"). This page makes per-endpoint repetition unnecessary.

**Steps:** rewrite → add `"api/overview"` as FIRST page of API Reference Getting Started group → `git rm api/rate-limiting.mdx blog/getting-started-with-unpod-api.mdx` → remove `api/overview`, `api/rate-limiting`, `blog/getting-started-with-unpod-api` from allowlist → checks → commit `feat(docs): rewrite API overview as canonical REST entry`.

### Task 21: `superdialog/introduction.mdx` (reframe) + absorb remaining blog pages

**Step 1:** Reframe introduction opening: "The dialog brain — works anywhere, shines on Unpod." Standalone pitch first (text-in/text-out; LiveKit/PipeCat/FastAPI/CLI), then a callout: "Coming from the Speech Stack? Wire it in with `SuperDialogAdapter` → /speech-stack/level-up-superdialog". Verify claims against `/Users/parvbhullar/Drives/Vault/Projects/Unpod/super/superdialog/README.md`.

**Step 2:** Absorb remaining blog content:
- `blog/building-voice-ai-agent.mdx` → check for anything the quickstart pair lacks; absorb or drop → `git rm`
- `blog/understanding-telephony.mdx` → fold useful explanations into `get-started/core-concepts.mdx` or `speech-stack/call-lifecycle.mdx` → `git rm`
- `blog/self-hosting-unpod.mdx` → fold into `platform/self-hosting/quickstart.mdx` → `git rm`
- `blog/webhook-integration.mdx` → fold into `speech-stack/hooks-events.mdx` → `git rm`
- `rmdir blog`

**Step 3:** Empty `scripts/docs-allowlist.txt` (all 9 entries now resolved). Run `node scripts/check-docs.mjs` — expect `OK` with NO allowlist warning.

**Step 4:** Commit `feat(docs): reframe superdialog intro, absorb remaining blog content`.

---

## Phase 3: Consistency pass

### Task 22: Naming + terminology sweep

**Step 1:** Find violations:

```bash
grep -rn --include="*.mdx" -e "Voice Stack" -e "Open-Source Platform" -e "parvbhullar/unpod" -e "geneffic/unpod" .
```

**Step 2:** Fix: "Voice Stack" → "Speech Stack" (prose references), old GitHub URLs → `https://github.com/unpod-ai/unpod`. Check `home`/landing references to removed pages.

**Step 3:** Concept-dedup: for each of `speech-stack/numbers|voice-profiles|pipes|trunks`, the page opens with a one-line definition + `Defined in [Core Concepts](/get-started/core-concepts#...)` link — trim any multi-paragraph re-explanations.

**Step 4:** checks → commit `refactor(docs): naming and concept-definition consistency sweep`.

### Task 23: Cold-read review (ICP walkthrough)

**Step 1:** Dispatch a fresh subagent with this brief: "You are a senior Python dev building a voice agent. You know FastAPI and LangChain; you've never seen Unpod. Read, in order: get-started/why-unpod.mdx, quickstart.mdx, first-phone-call.mdx, core-concepts.mdx, choose-your-path.mdx, speech-stack/bring-your-agent.mdx. At every step report: (a) anything you'd need that the page doesn't give you, (b) any term used before it's defined or linked, (c) any code you couldn't run as written, (d) where you'd stall. Cite file + line."

**Step 2:** Triage findings; fix real stalls (don't gold-plate).

**Step 3:** checks → commit `fix(docs): resolve cold-read stalls in get-started path`.

### Task 24: Final verification

**Step 1:** `node scripts/check-docs.mjs` → `OK`, zero allowlist entries.

**Step 2:** `npx mint broken-links` → clean.

**Step 3:** `npx mint dev` (or `npx mintlify dev`) → site renders; click through all 5 tabs once.

**Step 4:** `git log --oneline main-superdialog ^origin/main-superdialog` — review the commit series is coherent.

**Step 5:** Report completion to Parvinder with the commit list. Do NOT push without asking.
