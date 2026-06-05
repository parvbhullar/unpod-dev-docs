# Unpod Docs Restructure: ICP-First Information Architecture

**Date:** 2026-06-05
**Status:** Approved
**Supersedes:** `2026-02-19-docs-restructure-design.md` (scoped to the old Introduction tab; the site has since grown to 6 tabs and the problems are structural)

---

## Problem

The docs confuse the developer they most need to win. Four quickstarts compete, and none tells the reader which to take. The SDK tab — home for the primary reader — holds two real pages, while the best page for that reader (`sdk/bring-your-agent.mdx`) sits buried third in a list. Three audiences (code devs, no-code business users, self-hosters) share tabs and even share "Getting Started" groups. "Unpod" names three different things. Bridge, Pipe, and Agent each carry three conflicting definitions. Twenty-six orphaned files, including untouched Mintlify boilerplate in `essentials/`, sit on disk outside navigation.

## Decisions

| Decision | Choice |
|---|---|
| Primary reader (ICP) | Voice-AI app builder: a Python dev shipping a voice agent on Unpod |
| Product relationship | unpod-sdk first; superdialog underneath as the structured-dialog level-up |
| Scope | Restructure the IA and rewrite the core-path pages; re-slot the rest |
| Tab bar | Get Started · Speech Stack · SuperDialog · Platform · API Reference |
| Quickstart | One quickstart: browser-first, phone call as the immediate next page |
| Quickstart brain | Simplest LLM brain; superdialog introduced after first success |
| URLs | Free to rename — no redirect debt |

## Principles

1. **One journey, one quickstart.** The four quickstarts collapse into one browser-first quickstart in Get Started. The other three become: "Your first phone call" (phone path), Platform → Self-Hosting (Docker path), and API Reference → Overview (REST path).
2. **Speech Stack is the product; SuperDialog is the level-up.** The Speech Stack tab owns the unpod-sdk journey end to end. Speech Stack pages link down into SuperDialog ("ready for structured flows?"); SuperDialog is never a prerequisite.
3. **Single source of truth for concepts.** One Core Concepts page canonically defines Number, Voice Profile, Pipe, Trunk, Bridge, Agent/Brain, Session, and Space, with one diagram. Every other page links to it rather than redefine the terms.
4. **Name discipline.** "Unpod" = the platform and company. "Speech Stack" = the voice infrastructure plus unpod-sdk. "SuperDialog" = the dialog framework. "Platform" = the hosted UI and self-hosted deployment.
5. **Delete fearlessly.** Remove or absorb the boilerplate, the orphans, and the root-level page soup.

## New Information Architecture

### Tab 1: Get Started (fully rewritten)

| Page | Content | Source material |
|---|---|---|
| Why Unpod | The "80% of effort is speech infra" problem; what Unpod handles vs. what you write. One page, with vs-competition merged in. | `why-unpod/*.mdx` |
| Quickstart | Browser-first: install `unpod` → API key → ~20-line agent with the simplest LLM brain → talk in the browser. First conversation in ≤5 minutes; zero telephony concepts. | `unpod-sdk/docs/06-browser-quickstart.md`, `unpod-sdk/examples/browser_agent.py` |
| Your first phone call | Adds telephony to the same agent: voice profile → pipe → trunk/number → answer a real call. | `unpod-sdk/docs/05-quickstart.md`, `speech/quickstart.mdx` |
| Core Concepts | Canonical glossary + one architecture diagram: Number → Pipe → Bridge → Agent; Management vs Connectivity API; where SuperDialog slots in. Includes the naming note and the agent_id vs pipe_id disambiguation. | `core-components.mdx`, `architecture.mdx`, `unpod-sdk/docs/00-overview.md` |
| Choose your path | Router: existing agent → Bring Your Agent · structured dialogs → SuperDialog · no-code → Platform · self-hosting → Platform/Self-Host. | new |

The quickstart states the three base URLs (`UNPOD_SERVICE_BASE_URL`, `UNPOD_ORCHESTRATOR_BASE_URL`, runner `base_url`) once, with defaults. The browser playground documents the local-dev story.

### Tab 2: Speech Stack (★ = rewritten; rest re-slotted from `speech/` + `sdk/`)

**Your Agent**
- ★ Bring Your Agent — promoted to the front; adapter patterns (LangChain, OpenAI, Anthropic, HTTP, MCP, custom `DialogAdapter`); documents `.stream()` as the hot path
- ★ Adapters reference — auto-wrapping rules, when each adapter fits, error surfaces
- Level up to SuperDialog — bridge page into the SuperDialog tab

**Telephony**
- Numbers · Voice Profiles · Pipes · Trunks — each opens with a one-liner + link to Core Concepts
- Outbound calls · Call lifecycle & states (merge `call-lifecycle` + `telephony-states`; add the missing state diagram)

**Runtime**
- ★ AgentRunner & Sessions (merge `sdk-setup` + `session-controls`, currently duplicated across two tabs)
- Hooks & events · Metrics, cost & observability · WebSocket protocol (advanced)

**Going to production**
- Setup checklist · Deploy patterns · Recordings & transcripts

The `sdk/` and `speech/` directories merge into one `speech-stack/` directory.

### Tab 3: SuperDialog (re-slotted + repositioned)

- New first-page framing: "The dialog brain — works anywhere, shines on Unpod." Lead with the standalone pitch (text-in/text-out; deploys to LiveKit, PipeCat, FastAPI, CLI), and add a callout pointing Speech Stack users to `SuperDialogAdapter`.
- Order: Introduction → Quickstart → Thinking in Flows → Flows / Tools / Sessions / Architecture → CLI → API reference → Embedding Guides (Unpod Voice guide first).

### Tab 4: Platform (consolidates non-code audiences)

- **Studio & Spaces** (no-code): existing `Voice AI/*` pages re-slotted; stubs marked for later
- **Dev Platform** (developer dashboard): existing 10 pages
- **Self-Hosting**: root `quickstart.mdx`, `configuration.mdx`, `architecture.mdx` move here

### Tab 5: API Reference

- Keep the 40 endpoint pages. Add one rewritten ★ Overview that states base URLs and auth once; endpoint pages then drop the repetition. Cross-link each resource to its Speech Stack concept page.

### Deleted or absorbed

- `essentials/` (Mintlify boilerplate, 6 files), `development.mdx` — delete
- Root `index.mdx`, `home.mdx`, `introduction.mdx`, `platform.mdx`, `core-components.mdx` — absorbed into new pages
- Orphaned `api/` helper pages — absorbed into API Overview
- Blog: the quickstart absorbs `building-voice-ai-agent`; the rest re-slot into relevant tabs or drop
- `ai-tools/` (Claude Code, Cursor, Windsurf) — keep; slot into Get Started or Platform
- Fix the stale GitHub URL inconsistency in `docs.json` (`parvbhullar/unpod` vs `geneffic/unpod`)

## Execution Phases

1. **Skeleton** — new `docs.json` with the 5 tabs; `git mv` pages into `get-started/`, `speech-stack/`, `platform/`; delete the boilerplate/orphan set. Site builds; everything navigable.
2. **Core path rewrite** — the ★ pages: Get Started's five pages, Bring Your Agent, Adapters, AgentRunner & Sessions, API Overview. Lift every code sample from working source (`unpod-sdk/examples/`, `superdialog/examples/`); never write it freehand.
3. **Consistency pass** — sweep the naming; replace inline concept definitions with links to Core Concepts; cross-link the tabs; fix the stale URLs.

## Verification (each phase)

- `mintlify dev` builds clean; no broken internal links
- Every `docs.json` page exists on disk; zero orphans remain (scriptable check)
- Quickstart code runs against the SDK as written (snippets trace to `examples/`, so the check catches drift)
- Cold-read review: an agent role-playing the ICP walks the Get Started path and flags any step that would stall it

## Out of Scope

- Rewriting Studio/Space stub pages; new screenshots
- Content of the 40 API endpoint pages
- Repo-level docs (`unpod-sdk/docs/`, `superdialog/docs/` remain engineering docs; the site is the public face)
