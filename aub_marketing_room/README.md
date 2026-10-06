# AUB Marketing Room

Five specialist AI managers, briefed on AUB's real enrollment and affordability
situation. WOLF routes each question to the two or three who actually own it,
then adjudicates where they disagree.

**Live (no setup, no API key):** https://claude.ai/artifact/GiwGdBFsfdsG6vpxhAb2EW

## The room

| | |
|---|---|
| **BAHAA** | Evidence & numbers — measurement, attribution, what can actually be proven |
| **MAJD** | Growth path — channels, paid media, budget, cost per result |
| **RABIH** | Enrollment opportunity — Lebanon, the Gulf, the diaspora, MSFEA pipelines |
| **RAMI** | Operational dependencies — pricing presentation, capacity, what must exist first |
| **LEEN** | Room lead — opens the meeting, presses the disagreements, calls the decision |
| **WOLF** | Verification — audits the decision before it is called ready |

## How it works

```
  your mission
       │
       ▼   LEEN opens the meeting out loud
  BAHAA ─▶ MAJD ─▶ RABIH ─▶ RAMI      each hears everyone before them
       │
       ▼   LEEN presses the one or two real disagreements
   whoever was challenged answers back
       │
       ▼   LEEN calls it, then WOLF verifies
  ready / blocked, with per-manager flags
```

Three design decisions carry it:

1. **They take turns and hear each other.** Each manager sees the transcript so
   far and is told to name people and push back. That is what makes it a meeting
   rather than five monologues stapled together.
2. **The trade-off is real and worth knowing.** Because later speakers hear
   earlier ones, they anchor. Isolated parallel answers gave more independent
   judgement; this gives a genuine argument. The prompts push against anchoring,
   they do not eliminate it.
3. **WOLF is a gate, not a chair.** After LEEN decides, WOLF audits for unsourced
   figures, internal numbers asserted as fact, recommendations needing capacity
   nobody has, and disagreements that got smoothed over — then returns ready or
   blocked. A manager who said "I don't have that number" counts as transparency.

## Grounded, not improvised

The managers are briefed with sourced figures (`AUB_CONTEXT` in `roster.js`) and
told to label anything else as an estimate: AUB's ~8,000 students from 90+
countries and 50-59% acceptance band; 37% of undergraduates on aid; the 2020-21
dollarization at 3,900 vs 1,515 LBP (~260% increase) and the ~5,000-student shift
to the Lebanese University that followed; MSFEA's PhD programs and GA/GRA/Fellowship
support; and 2026 higher-ed marketing benchmarks (TikTok at 18-28% of 18-24
awareness, 0.89% education CTR, 15-25% inquiry-to-application, 7.7% email-to-
application, ~$2,849 cost per enrolled student).

Sources: AUB registrar/admissions pages; L'Orient Today, LCPS and Xinhua on
Lebanon's higher-education funding crisis; Search Influence, RC Strategies and
KEG/UCAS on 2026 benchmarks.

## Files

| File | Purpose |
|---|---|
| `roster.js` | The six managers and all three prompt builders. **Start here.** |
| `index.html` | The whole app. Detects its host and picks a transport. |
| `api/ask.js` | Vercel serverless function — the only place the API key lives. |
| `build.mjs` | Wraps `index.html` into a complete document for static hosting. |

One page, two hosts. On claude.ai it calls `claude.use("sample")` and the viewer's
own Claude account answers. Anywhere else it POSTs to `/api/ask`. Same prompts,
same flow, no duplicated logic.

## Deploy to Vercel

```bash
cd aub_marketing_room
npm install
npm i -g vercel          # once
vercel login
vercel --prod
```

Then set the key and redeploy so the function picks it up:

```bash
vercel env add ANTHROPIC_API_KEY production   # paste sk-ant-...
vercel --prod
```

Or through the dashboard: import the repo, set **Root Directory** to
`aub_marketing_room`, add `ANTHROPIC_API_KEY` under Settings → Environment
Variables, deploy. `vercel.json` already sets the build command and output
directory.

Check it locally first with `vercel dev` — `npm run build` alone produces the
static page but not the function, so the button will correctly report no model
access.

## Things that will bite you

- **Function timeout.** `api/ask.js` sets `maxDuration: 60`, the Hobby ceiling.
  The `default` tier runs at `medium` effort to stay inside it. If you raise
  effort or the prompts grow, calls start hitting the wall — lower the effort in
  `EFFORT` or move to a paid plan.
- **Cost is per manager, per run.** Three managers plus routing plus synthesis is
  five model calls. WOLF is capped at three managers for exactly this reason. Lebanese playback
  adds one cheap call per manager on top.
- **The key never goes in the browser.** It is read from `process.env` inside the
  function only. Anything in client-side JavaScript is public.
- **Visitor input is untrusted.** It goes into a prompt, so someone can try to
  steer WOLF. It stays in the user turn and the managers have no tools.
- **Rate limiting is not implemented.** Before this faces anyone outside your
  team, add per-IP limiting — one visitor in a loop is how the budget actually
  disappears.

## What this is not

It cannot check its own work. Five confident managers can be wrong together and
the brief will still read as authoritative. Personas change framing, not
knowledge — the real gains here are context isolation, parallelism, and forced
disagreement. Treat the brief as a structured starting argument, and verify any
number before it reaches a budget.
