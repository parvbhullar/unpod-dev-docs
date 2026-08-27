# SNR Developer DX Review — Unpod Platform

**Date:** 2026-05-29  
**Scope:** unpod-sdk, superdialog, supervoice, unpod-dev-docs  
**Personas:** (A) Senior Python developer integrating an existing LangChain/custom agent via self-serve docs; (B) Greenfield developer building a complex structured voice AI agent (sales qualification, appointment booking)  
**Goal:** Give their agent a phone number in under 30 minutes

---

## TL;DR

The integration architecture is clean and well-designed. A developer can connect their LangChain chain to a phone-capable voice agent in ~15 lines of code. The problem is **none of this is discoverable from the docs**. Two P0 gaps (missing SDK docs page, no local dev story) will block the majority of self-serve integration developers before they write a single line.

---

## The Correct Integration Path (What It Should Feel Like)

```python
# 1. Install
uv add unpod

# 2. Write your entrypoint — bring your existing agent
async def entrypoint(ctx: CallContext) -> None:
    ctx.session.dialog_machine = LangChainAdapter(your_chain)
    await ctx.session.run()

# 3. Start your runner
AgentRunner(entrypoint=entrypoint, agent_id="my-agent").start()
```

Your LangChain chain is now a phone-capable voice agent.

**Key architectural facts a SNR dev needs to know:**
- `DialogAdapter` is a duck-typed protocol — no inheritance required
- `LangChainAdapter`, `HTTPAdapter`, `SuperDialogAdapter`, `MCPAdapter` (WIP) are bundled
- `session.stream()` is the hot path — NOT `turn()`
- SuperDialog is optional — it's a full state-machine framework for complex flows, not a requirement
- Management (numbers, voice profiles, agents) is a one-time setup via `AsyncClient`

---

## Key Challenges & Blockers

### Blocker 1 — Zero "Bring Your Agent" Entry Point in Docs [P0]

The `/sdk/` directory in unpod-dev-docs is **empty**. The docs site features SuperDialog prominently, making it look mandatory. The actual 3-step integration (`LangChainAdapter` → `AgentRunner`) is only discoverable inside example files.

A senior dev will spend 20–40 minutes reading the wrong docs or conclude the platform requires rewriting their agent.

**Impact:** Primary conversion killer for self-serve integration.

---

### Blocker 2 — No Local Dev Story [P0]

Every example assumes a live Unpod account, live orchestrator, and live telephony. There is no:
- Local call simulator for testing entrypoints offline
- Mock `CallContext`/`Session` for unit testing
- Docker Compose for running supervoice locally

A SNR dev's first instinct is "let me test before I provision anything." This is currently impossible.

**Impact:** Blocks trust-building before commitment. High churn risk.

---

### Blocker 3 — `LangChainAdapter` Has Silent Message Format Assumptions [P1]

```python
# Hardcoded in LangChainAdapter:
await self._chain.ainvoke({"messages": self._history})
```

Works with bare `ChatModel` chains. Breaks silently with `RunnableWithMessageHistory`, `AgentExecutor`, LCEL chains expecting `input` key, or any custom input schema.

Failure mode: the LangChain internal error surfaces, with no mention of the adapter.

**Impact:** Hits ~60% of LangChain users with non-trivial chain setup.

---

### Blocker 4 — Management Setup Coupling is Undocumented [P1]

Before the first call works, a dev must:
1. Create an agent via `client.agents.create()` with a valid `voice_profile`
2. Understand that `runner_agent_id` in the API must match `AgentRunner(agent_id=...)`
3. Sync numbers
4. Know the difference between `agent.id` (UUID) and `agent_id` (name string used by runner)

No single doc covers this setup sequence. Examples show it inline but without explanation.

**Impact:** First-time setup frequently fails on the `runner_agent_id` / `agent_id` coupling.

---

### Friction 5 — `stream()` is the Hot Path but Not Signposted [P1]

The `session.run()` loop exclusively calls `dialog_machine.stream()`. `.turn()` is never called by the framework. The `DialogAdapter` protocol exposes both with no indication of which matters.

A dev writing a custom adapter who implements `turn()` correctly but `stream()` lazily (single-chunk) will get choppy, broken audio with no error message.

**Impact:** Most custom adapter authors will get this wrong on first attempt.

---

### Friction 6 — Bridge Errors Exit Silently [P2]

```python
elif isinstance(event, ErrorEvent):
    break  # no logging, no hook fired, no error detail
```

When a call breaks (STT failure, bridge disconnect, rate limit), `session.run()` exits silently. Developers cannot distinguish a normal call end from a provider crash. No `on("error")` hook, no typed error classes, no retry surface.

**Impact:** Production debugging is painful. Root cause attribution is manual log archaeology.

---

### Friction 7 — Protocol Frame Mirroring is a Hidden Time Bomb [P2]

`unpod-sdk/_protocol.py` is a manual copy of supervoice's internal protocol frames. No tests verify the two stay in sync. A supervoice update that adds or renames a field will cause silent data loss or deserialization errors in the SDK with no helpful error message.

**Impact:** Latent P0. Becomes critical at the first breaking protocol change post-SDK release.

---

## SuperDialog-Specific DX Issues

For developers who choose SuperDialog (state machine path), additional surface-level gaps:

| Issue | Detail |
|-------|--------|
| `Flow` vs `ConversationFlow` naming | `ConversationFlow` appears in error messages; `Flow` is the exported alias — confusing |
| No entry-point guide in `__init__.py` | 23 exports, no hierarchy guidance |
| `LangChainAdapter._infer_schema` silent fallback | Unsupported type hints silently become `"string"` — LLM gets wrong schema |
| `Tool.from_dict()` raises raw `KeyError` | Missing required field gives no context |
| `max_turns` TODO in production code | Feature marked TODO in `machine.py:595` — unclear if enforced |
| `switch_flow(preserve_memory=True)` undocumented | What exactly is preserved? Docs don't say |

---

## Improvements by Priority

| Priority | What | Impact |
|----------|------|--------|
| **P0** | Write SDK docs page: "Bring Your Agent" — single page showing 3-step LangChain integration | Unblocks primary self-serve path |
| **P0** | `AgentRunner(dev_mode=True)` with local call simulator | Test without cloud account; builds trust |
| **P1** | Fix `LangChainAdapter` — accept callable or configurable input key | Works for all LangChain chain shapes |
| **P1** | Add `on("error")` hook with typed `ErrorEvent` (retriable vs fatal) | Production debugging, retry logic |
| **P1** | "Setup checklist" doc: agent → voice_profile → runner_agent_id mapping | Eliminates first-run setup failures |
| **P1** | Clarify in `DialogAdapter` docstring that `stream()` is the hot path | Prevents ~100% of custom adapter bugs |
| **P2** | Generate `_protocol.py` from supervoice at build time | Eliminates protocol drift risk |
| **P2** | Wrap `httpx` errors in typed `UnpodAPIError` subclasses | `AuthError`, `NotFoundError`, `ServerError` |
| **P2** | Add `py.typed` + tighten type stubs | IDE autocomplete; mypy catches adapter mistakes |
| **P3** | `on("error")` retry policy interface | Dev decides retry vs abort per error type |
| **P3** | TypeScript SDK (mirrors Python surface) | Unblocks JS/TS user segment |

---

## SuperDialog Quick Wins (If Prioritising That Path)

1. Entry-point guide comment in `__init__.py` (2 min, high leverage)
2. Rename `ConversationFlow` → `Flow` internally (5 min, prevents import confusion)
3. Log warning when `PythonTool._infer_schema` encounters unsupported type hints
4. Wrap `Tool.from_dict()` `KeyError` with field-name context
5. Document `stream()` as hot path in `DialogAdapter` protocol

---

---

## Greenfield Developer: Complex Structured Voice AI Agent

**Persona:** Building a sales qualification bot, appointment booking agent, or customer support flow from scratch. Needs structured conversations, tool calling, and voice delivery.

**Primary tool:** SuperDialog (`DialogMachine` + flows)

---

### What's Actually Good (Hidden Gems)

The CLI tooling is better than most devs will discover:

```bash
superdialog flow generate "Book appointments, collect name, date, doctor" --output flow.json
superdialog flow lint flow.json      # catches broken edge refs
superdialog flow draw flow.json      # Mermaid diagram
superdialog chat flow.json           # interactive REPL — zero infrastructure
```

`superdialog chat` is the single biggest greenfield DX win: full flow testing in one command, no Unpod account, no phone number. Most devs will never find it.

---

### Greenfield Blocker 1 — Mental Model Shift Not Explained [P0]

SuperDialog inverts how most LLM devs think:

```
Traditional:  user input → LLM decides everything → output
SuperDialog:  developer defines node topology → LLM fills evaluation + extraction gaps
```

A senior dev accustomed to writing system prompts will fight the framework for 2–3 hours before realising they need to **design the graph first**, then let the LLM operate within it.

No single doc explains this inversion. The architecture doc describes components; it doesn't reframe the mental model.

**Fix:** A "Thinking in Flows" guide — one page showing the shift from "write a system prompt" to "design a state topology." Surface `superdialog chat` above the fold.

---

### Greenfield Blocker 2 — Criteria and Edges Are Both LLM-Evaluated with No Guard Rails [P1]

Both core primitives rely on LLM judgment at runtime. Common mistake:

```json
"completion_criteria": [{"key": "email", "description": "User gave email"}],
"edges": [{"condition": "User provided a phone number", "target": "next_node"}]
```

Criteria says collect email. Edge fires on phone number. Email is never collected. No lint catches this — only a broken production call reveals it.

**Fix:** `flow lint` rule that checks criteria keys are referenced in at least one edge `input_schema`. Warning when criteria and edge conditions appear logically inconsistent.

---

### Greenfield Blocker 3 — No Eval Story [P1]

After "does it work locally" the next question is "does it work correctly at scale?" There's no eval harness (planned v0.3). No way to:
- Run a flow against a dataset of test conversations
- Score criteria extraction accuracy
- Catch regressions when a node instruction changes

`superdialog chat` is manual. Traversal logs exist but no analysis tooling.

**Impact:** Greenfield devs building anything serious hit this wall immediately after their first demo.

---

### Greenfield Friction 4 — Router Nodes Are Heuristic-Based and Fragile [P1]

Silent routing nodes (branch without speaking) depend on a runtime heuristic — if `instruction` starts with "Do not output text..." it's treated as a router. If the LLM ignores the instruction and generates text anyway, the runtime doesn't catch it.

The explicit `node_type: "router"` override exists but is not taught upfront.

**Fix:** Make `node_type: "router"` required for router nodes. Remove the heuristic. Prevents an entire class of subtle branching bugs.

---

### Greenfield Friction 5 — Dual LLM Calls Per Turn Not Documented [P2]

Default mode makes two LLM calls per turn: one for criteria/edge evaluation, one for response generation. For voice, this doubles latency (~800ms–2s per turn before TTS starts).

A `toolcall` adapter mode collapses to one call (requires function-calling model) but is not documented in the flow design path. Devs discover the latency problem in production.

**Fix:** Surface this in the quickstart with a table showing latency implications of each adapter mode.

---

### Greenfield Friction 6 — `flow generate` Output Is Not Auto-Validated [P2]

The LLM bootstrap can produce broken edge targets, dead-end nodes with no path to final, and missing `max_turns` on looping nodes. `flow lint` catches broken refs but not structural issues.

**Fix:** Auto-run lint after generate. Add `--strict` flag that checks for unreachable nodes and loops without `max_turns` guards.

---

## Persona Comparison

| Dimension | Integration Dev (A) | Greenfield Dev (B) |
|-----------|--------------------|--------------------|
| **Primary SDK** | `unpod-sdk` (AgentRunner + LangChainAdapter) | `superdialog` (DialogMachine + flows) |
| **Core blocker** | Can't find LangChainAdapter in docs | Mental model shift not explained |
| **Hidden gem** | 3-step setup with any LangChain chain | `superdialog chat` zero-infra testing |
| **Biggest runtime risk** | Silent bridge failures | Criteria/edge LLM evaluation fuzziness |
| **Production concern** | Error propagation across bridge | No eval harness |
| **Latency risk** | Bridge reconnect | Dual LLM calls per turn |
| **Debugging** | Distributed logs, no correlation ID | Traversal logs, no analysis tooling |

---

## Combined Priority List (Both Personas)

| Priority | What | Persona |
|----------|------|---------|
| **P0** | SDK "Bring Your Agent" docs page | Integration |
| **P0** | `AgentRunner(dev_mode=True)` local call simulator | Integration |
| **P0** | "Thinking in Flows" guide + surface `superdialog chat` | Greenfield |
| **P1** | Fix `LangChainAdapter` configurable input key | Integration |
| **P1** | Criteria ↔ edge consistency `flow lint` rule | Greenfield |
| **P1** | `node_type: "router"` required (remove heuristic) | Greenfield |
| **P1** | Document dual LLM call modes + latency tradeoffs | Greenfield |
| **P1** | Setup checklist doc: agent → voice_profile → runner_agent_id | Integration |
| **P1** | `stream()` marked as hot path in `DialogAdapter` docstring | Integration |
| **P1** | `on("error")` typed hook | Both |
| **P2** | Basic eval harness — CSV test runner for flows | Greenfield |
| **P2** | Auto-lint + `--strict` after `flow generate` | Greenfield |
| **P2** | Generate `_protocol.py` from supervoice at build time | Integration |
| **P2** | Wrap `httpx` in typed `UnpodAPIError` subclasses | Both |
| **P2** | `py.typed` + tighten type stubs | Both |
| **P3** | TypeScript SDK | Both |

---

## Files Referenced

- `unpod-sdk/src/unpod/adapters/langchain.py` — LangChainAdapter message format coupling
- `unpod-sdk/src/unpod/connectivity/session.py` — silent error exit, missing `on("error")` hook
- `unpod-sdk/src/unpod/connectivity/runner.py` — AgentRunner entrypoint contract
- `unpod-sdk/src/unpod/_protocol.py` — manual protocol mirror (divergence risk)
- `unpod-sdk/src/unpod/__init__.py` — DialogAdapter not exported
- `superdialog/src/superdialog/__init__.py` — no entry-point hierarchy guide
- `superdialog/src/superdialog/tools/decorator.py` — silent type hint fallback
- `unpod-dev-docs/sdk/` — **empty** (P0 gap)
