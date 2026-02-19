# Unpod Documentation Restructure: Get Started Experience (v2)

**Date:** 2026-02-19
**Status:** Approved
**Goal:** Make documentation easier to use for both business users and developers by adding a clear "Get Started" path with audience routing.

---

## Problem

The Introduction tab lacks a clear entry point for different audiences. Business users and developers land on the same page with no guidance on where to go next. There is no quickstart guide for either audience.

## Current State

The docs now have 4 tabs:
1. **Introduction** — introduction.mdx, core-components.mdx
2. **Voice AI** — Space View (5 pages), Studio View (dashboard, 7 agent pages, knowledge base, call logs, api key)
3. **Dev Platform** — telephony, numbers, provider, agents, analytics, load testing, security
4. **API Documentation** — quickstart, auth, space, execution, logs, provider, telephony, billing

## Constraints

- Do NOT touch Voice AI, Dev Platform, or API Documentation tabs
- Only modify the Introduction tab (rename + improve + add quickstart)
- Do NOT reference unpod.dev in the Choose Your Path cards (keep it in Platform Base URLs section)

---

## Design

### Navigation Changes

Rename the first tab and add quickstart page:

```
Before:
  tab: "Introduction"
    group: "Documentation"
      - introduction
      - core-components

After:
  tab: "Get Started"
    group: "Get Started"
      - introduction       (edited — add Choose Your Path section)
      - quickstart          (new — Voice AI Quickstart)
      - core-components     (unchanged)
```

Voice AI, Dev Platform, API Documentation tabs — UNCHANGED.

---

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `introduction.mdx` | **Edit** | Replace "Platform Base URLs" with "Choose Your Path" cards + prerequisites |
| `quickstart.mdx` | **Create** | Voice AI Quickstart with Business + Developer tabs |
| `docs.json` | **Edit** | Rename tab "Introduction" → "Get Started", add quickstart page, rename group |

**3 files. 3 other tabs untouched.**

---

### Page 1: Introduction (Edited)

**Purpose:** Welcome all visitors and route them to the right path.

**What stays (unchanged):**
- "Getting Started" header + "The AI voice your business can trust" tagline
- "How Unpod Works?" 3-card setup (Space, Agent, Telephony)
- Demo link
- Key Capabilities
- Use Cases
- Why Choose Unpod?

**What changes — "Platform Base URLs" section replaced with "Choose Your Path":**

Two side-by-side `<Card>` components with prerequisites and routing:

**Card 1: Business Users (unpod.ai)**
- Prerequisites: active email, modern browser, internet connection
- Best for: non-technical users, business teams, customer support managers
- What you get: no-code AI agent builder, pre-built templates, visual dashboard, team collaboration tools
- Links to → `/quickstart` (Business Users tab) or Voice AI tab intro

**Card 2: Developers (unpod.dev)**
- Prerequisites: Node.js v20+, npm/yarn, Git
- Best for: developers, technical teams, system integrators
- What you get: full API access, custom telephony configuration, advanced agent programming, developer tools and SDKs
- Links to → `/quickstart` (Developers tab) or Dev Platform tab intro

The Platform Base URLs (unpod.ai / unpod.dev with purposes) can stay as a smaller subsection below the cards for reference.

---

### Page 2: Quickstart (New)

**Purpose:** Get from zero to a working voice agent in minutes.

**Structure:** Single page using Mintlify `<Tabs>` component for audience switching.

#### Tab 1: "Business Users"

Condensed 6-step walkthrough linking to full Voice AI tab guides:

1. **Sign Up** — Create account at unpod.ai
2. **Create a Space** — Set up your workspace (link to Voice AI/Space View)
3. **Create Your Agent** — Set up personality, voice, model (link to Voice AI/Studio View/Agents)
4. **Setup Telephony** — Create a bridge, get a number, configure provider (link to Dev Platform/telephony)
5. **Publish** — Make your agent live
6. **Make Your First Call** — Dial the number and test

Each step: 2-3 sentences + one screenshot. Full details live in the Voice AI tab.

#### Tab 2: "Developers"

Self-hosting / infrastructure setup:

1. **Prerequisites** — Node.js v20+, npm/yarn, Git
2. **Clone & Install** — git clone the repo, install dependencies
3. **Configure** — Environment variables, API keys
4. **Create an Agent** — Via API or configuration
5. **Connect Telephony** — Numbers, providers, bridges
6. **Test** — Make a call to verify

This section will be lighter initially. Links to Dev Platform and API Documentation tabs for details.

---

### Page 3: Core Components (Unchanged)

Stays exactly as-is. Numbers, Providers, Bridges, Agents overview + data flow diagram.

---

## Implementation Order

1. Edit `introduction.mdx` — replace "Platform Base URLs" with "Choose Your Path" cards
2. Create `quickstart.mdx` — Voice AI Quickstart with both audience tabs
3. Edit `docs.json` — rename tab to "Get Started", add quickstart page to navigation
4. Verify all internal links work
