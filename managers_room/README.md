# Managers Room

A working implementation of the pattern behind "AI managers room" products —
the kind of thing you see demoed as a dashboard full of named AI staff.

This is the honest version: ~400 lines of Python, no framework, no magic.

## What it actually is

The marketing makes it look like a team of digital employees. Architecturally
it is one well-known pattern — **orchestrator + agents-as-tools**:

```
  your request
       │
       ▼
   WOLF  ── the orchestrator (claude-opus-5)
    │      sees each manager as a TOOL and decides who to consult
    │
    ├──▶ ask_leen(task)   ──▶ isolated conversation, LEEN's system prompt
    ├──▶ ask_sofia(task)  ──▶ isolated conversation, SOFIA's system prompt
    ├──▶ ask_yara(task)   ──▶ (these run concurrently)
    │
    ▼
  executive brief — synthesised, with disagreements kept intact
```

Each "manager" is a system prompt + a model + optionally some tools. That's it.
The names (LEEN, SOFIA, YARA, HOPE, LAYAN) are a UI affordance — they make the
system legible to a non-technical buyer. The engineering substance is in three
decisions:

**1. Agents as tools.** The orchestrator doesn't get a "pick a specialist" menu.
Each manager is a real tool in its `tools` array, so routing is just tool
selection — something the model is already heavily trained to do well.

**2. Context isolation.** Every manager runs in a *fresh* conversation and never
sees the other managers' answers. This is the point, not a limitation. It keeps
each context small and cheap, lets them run in parallel, and means the
orchestrator receives conclusions rather than reasoning sprawl. It also produces
genuine disagreement, because nobody is anchored on anyone else's answer.

**3. Preserved disagreement.** The easy version of this averages everyone into
bland consensus, which is exactly what makes most multi-agent demos useless.
WOLF is instructed that conflict between managers *is* a finding, and must be
surfaced and adjudicated, not smoothed over. See the `--demo` output: the
measurement manager undercuts the growth manager's headline number, and the
brief says so and picks a side.

## Run it

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...        # or: ant auth login

python run.py "We have $40k for Q1. Paid ads or fix our organic presence first?"
```

No key yet, or you just want to see the output shape? This costs nothing and
makes no API calls:

```bash
python run.py --demo
```

Either way you get a terminal brief plus `room.html` — a self-contained
dashboard showing who was consulted, what each said, timings and token counts.
`--json out.json` gives you the machine-readable run log.

## Files

| File | What's in it |
|---|---|
| `roster.py` | Who's in the room. **Start here** — add a manager and the orchestrator picks it up automatically. |
| `room.py` | The orchestrator loop: expose managers as tools, dispatch, collect, synthesise. |
| `runlog.py` | Plain data types for a run. No SDK dependency, so the dashboard works standalone. |
| `dashboard.py` | Renders a run as a themed, responsive HTML page. |
| `run.py` | CLI, including `--demo`. |

## Adding a manager

One entry in `ROSTER` in `roster.py`:

```python
Manager(
    name="omar",                       # tool handle -> becomes ask_omar
    display="OMAR",
    title="Finance & Pricing",
    domain="unit economics, pricing, margin, runway",   # this is what routes work to him
    system="You are OMAR, head of finance and pricing.\n..." + _SHARED_RULES,
)
```

No other file changes. `_manager_tools()` builds the tool schema from the
roster, so the orchestrator sees the new manager on the next run. The `domain`
string is doing the real work — it is the only thing WOLF reads when deciding
who to consult, so make it specific.

## Things worth knowing if you extend this

- **Parallel tool results must go back in ONE user message.** Splitting them
  across several messages quietly teaches the model to stop making parallel
  calls, and you lose the concurrency without any error telling you why.
- **Cost scales with managers consulted, not with the roster size.** WOLF is
  told to consult 2-4, which keeps a five-manager room affordable. Watch the
  token count in the dashboard footer before you grow the roster.
- **`thinking={"type": "adaptive"}`** is how current models do extended
  thinking. The older `budget_tokens` form is rejected with a 400 on Opus 5.
- **Workers default to the same model as the orchestrator.** Set `WORKER_MODEL`
  in `roster.py` to `"claude-sonnet-5"` to cut cost — measure before you do,
  since the specialists are where answer quality actually comes from.
- **`fallbacks="default"`** means a safety-classifier refusal reroutes
  server-side instead of returning an unusable turn. Refusals are still handled
  explicitly in `_text_of()`.
- **Add tools per manager, not globally.** SOFIA and LAYAN get `web_search`
  because their domains need current data; giving it to everyone just adds
  latency and cost. Any manager with a server tool can stop on `pause_turn` —
  `consult()` resumes up to three times.

## Where this pattern breaks down

Worth saying plainly, since the demos never do:

- **It cannot check its own work.** Five confident managers can all be wrong
  together, and the brief will still read as authoritative. Nothing here
  verifies a claim against reality.
- **Personas don't create expertise.** Telling a model "you are head of
  security" changes tone and framing, not knowledge. The gain over one
  well-prompted call is context isolation and parallelism, not new capability.
- **It's the wrong tool for a single well-specified question.** One request to
  one model is faster, cheaper, and usually as good. This earns its cost when a
  question genuinely spans domains that trade off against each other.
