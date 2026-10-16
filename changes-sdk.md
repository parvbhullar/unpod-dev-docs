# SDK Docs Changes

Docs updated to match the Python SDK (`unpod` 0.5.0) and the QA report
(`Sdk_test_docs_update.docx`). 19 files in total: 3 new, 16 modified.

## New files (3)

### `speech-stack/agent-settings.mdx` — "Configure an Agent"

- Read an agent's current settings (`agents.get`)
- Change the voice (`agents.update(voice_profile=)`), plus `voice.add`, `voice.update` and `voice.remove`
- Change the greeting
- Change the phone number: `agents.update(number=)`, `numbers.agent.change()`, `telephony.numbers.detach()`
- Background sound: room, volume, on/off, with a warning that a volume of `0.0` does not mean off
- Noise cancellation: table of all values
- Mute call (`mute_until_first_bot_complete`)
- First speaker, recording, call limits, `llm_model`, changing the brain
- Silence timeout behaviour (60 s, "Are you still there?")
- Table of every `update()` argument

### `speech-stack/agent-tools.mdx` — Handover, Voicemail & Follow-up

- Warning: `tools=` replaces the whole dict, so read it first, change it, then write it back
- Handover: `enabled`, `numbers`, `mode`, `decision_timeout_s`, the difference between warm and cold, how to turn it off, how to test it
- Setting the voicemail message
- Automatic follow-up: the `follow_up` template, attaching it, `automatic_followup_enabled`, how to read scheduled calls

### `speech-stack/domain-dictionaries.mdx` — Domain Dictionaries

- The three sections (vocabulary, pronunciation, fillers), all read as wrong → right
- Writing a dictionary (`upsert`), tagging an agent, bundled seeds, `clone`
- Warning: a domain name containing words such as "realty" or "bank" gets merged with a bundled dictionary
- Adding a term later, method table, troubleshooting

## Modified files (16)

### `docs.json`

- Added the 3 new pages to the "Speech Infrastructure" nav group

### `get-started/quickstart.mdx` (all QA issues are fixed here)

- Env block: replaced `api.unpod.ai` with `https://unpod.ai`, switched to a `.env` file format, removed the `UNPOD_API_KEY` line. Added a warning that both URLs must be the bare host.
- Six-steps table: "queued" changed to `pending`
- Step 2: Prompt mode / Playbook mode tabs, output corrected to `brain_execution = embedded`, note on the 409 conflict
- Step 3: removed `n.country` (the cause of the crash), filtered for free numbers, handled the "no numbers" case, added a status table
- Step 4: the script now finds a free number and attaches it on its own; added sample output
- Step 6: added `connected`, `notConnected` and `not_connected` to the `TERMINAL` set
- Troubleshooting: ConnectError, 404, 401, ValueError, 409
- Next cards: Configure, Handover, Dictionaries

### `get-started/first-phone-call.mdx`

- Prerequisites: platform token and the 4 env values instead of `UNPOD_API_KEY`
- Corrected the Step 1 auth paragraph
- `setup.py`: `numbers.list(status="active")` replaced with `telephony.numbers.list()` + `agents.numbers.attach()`
- Runner code comment: `platform_token` / `org_handle`

### `get-started/getting-started.mdx`

- Credentials table: SDK host is `unpod.ai`; AgentRunner auth is now the platform token

### `get-started/core-concepts.mdx`

- "reads `UNPOD_API_KEY`" changed to "reads token + org handle from `.env`"

### `speech-stack/agents.mdx`

- Example uses `voice_profile="Riya"`
- Create table: added `domain`, `background_sound*`, `noise_cancellation`, plus the 409 note
- Update section: link to the Configure page and a `voice.update()` example
- Example of moving a number (`update(number=)`, `numbers.agent.change`)
- Method table: added `voice.update` and `numbers.agent.change`

### `speech-stack/numbers.mdx`

- Telephony listing with output for listing numbers
- Explained the difference between `numbers.list()` and `telephony.numbers.list()`
- "First free number" pattern moved to the new flow
- New section: "Move a number to another agent"
- Rotate example now uses `agents.update(number=)`

### `speech-stack/agent-runner.mdx`

- Env: `UNPOD_PLATFORM_TOKEN` + `UNPOD_ORG_HANDLE`, `UNPOD_BASE_URL="https://unpod.ai"`
- Constructor signature: `platform_token` instead of `api_key`; added `org_handle`
- Fixed a code comment

### `speech-stack/setup-checklist.mdx`

- Rewrote the environment variables table: token, handle and both URLs are required; `UNPOD_API_KEY` is optional and the runner no longer accepts it

### `speech-stack/deploy.mdx`

- Production requirements, replica command and `.env` summary: platform token instead of API key, host `unpod.ai`

### `speech-stack/bring-your-agent.mdx`

- Note: the runner needs `UNPOD_PLATFORM_TOKEN` + `UNPOD_ORG_HANDLE`

### `speech-stack/analytics.mdx`

- Tip linking to the follow-up page, placed before "Reading Results"

### `playbook/api.mdx`

- Python SDK row: host `unpod.ai`, auth is the platform token

### `speech-stack/outbound-calls.mdx`, `voice-profiles.mdx`, `websocket.mdx`

- Code comments only: "reads `UNPOD_API_KEY`" changed to "reads credentials from `.env`"

## Not changed

- `playbook/developer-setup.mdx` still references `api.unpod.ai`. That is the harness's speech-service host, and the correct host could not be confirmed.
