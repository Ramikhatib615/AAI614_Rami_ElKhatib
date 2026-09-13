# Setup and deploy

About 40 minutes end to end. Do it in this order — each step gives you a value the next one needs.
Run `pnpm preflight` at any point to see what is still missing.

## 1. Move the code into its own private repo

The app currently sits on a branch of the public `AAI614_Rami_ElKhatib` course repo, which is fine
for code but wrong as a permanent home: the dashboard's purpose (which professors you are writing
to, which programs you are chasing) should not be public.

```bash
# On github.com: New repository → phd-command-center → Private → do not initialise it.
git clone --single-branch --branch claude/phd-app-command-center-0maw1c \
  https://github.com/Ramikhatib615/AAI614_Rami_ElKhatib.git phd-transfer
cd phd-transfer/phd-command-center
rm -rf ../.git && git init && git add -A && git commit -m "PhD command center"
git branch -M main
git remote add origin https://github.com/Ramikhatib615/phd-command-center.git
git push -u origin main
```

Copy `PROMPT.md`, `CLAUDE.md` and `docs/` across too — they are the project's rules and plan.

## 2. Credentials

| Variable                                | Where it comes from                                                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                          | Vercel project → Storage → Neon (marketplace). Vercel sets this for you.                                                                                                                         |
| `AUTH_SECRET`                           | `openssl rand -base64 32`                                                                                                                                                                        |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub → Settings → Developer settings → OAuth Apps → New. Callback URL: `https://<your-domain>/api/auth/callback/github` (add `http://localhost:3000/api/auth/callback/github` for local work). |
| `AUTH_ALLOWED_EMAILS`                   | Your own address. It is the entire access model — nobody else can sign in.                                                                                                                       |
| `CRON_SECRET`                           | `openssl rand -hex 16`                                                                                                                                                                           |
| `ANTHROPIC_API_KEY`                     | platform.claude.com. Set `AI_MONTHLY_BUDGET_USD` too; the app stops at that number.                                                                                                              |
| `OPENALEX_API_KEY`                      | openalex.org — free, and raises the daily budget from $1 to $10. Without it, discovery is rate limited almost immediately.                                                                       |
| `OPENALEX_MAILTO`                       | Your contact address; it identifies the app in the User-Agent.                                                                                                                                   |
| `PROFILE_PHONE`                         | Your phone number. It is deliberately not in git.                                                                                                                                                |

Locally: `cp .env.example .env.local`, fill it in, then `pnpm preflight`.

## 3. Database

```bash
pnpm db:migrate   # creates the ten tables; never drops anything
pnpm db:seed      # loads the PROMPT.md §7 programs, all marked unverified
```

## 4. Vercel

1. Import the repo. If you kept the app inside the course repo, set **Root Directory** to
   `phd-command-center`; if you moved it, leave it at the root.
2. Add every variable above to **Production** and **Preview**.
3. `vercel.json` already declares the daily cron on `/api/cron/worker`. On the Hobby plan cron can
   only run once a day, which is why the dashboard has a **Run queue** button — that is the normal
   way work moves.
4. Deploy a preview first, run the smoke test below, then promote.

## 5. Smoke test

- [ ] The public pages load on a phone and a laptop.
- [ ] `/dashboard` redirects to sign-in when signed out, and lets your address in.
- [ ] An address that is not on the allowlist is refused.
- [ ] `/dashboard/cv` shows the CV and, until you confirm a contact address, refuses to export it.
- [ ] `/dashboard/jobs` → **Run queue** with a `diagnostics.ping` job queued finishes it.
- [ ] An `ai.probe` job returns and appears in the month's spend (a fraction of a cent).
- [ ] A professor discovery job stores candidates with real OpenAlex paper links.
- [ ] A verified professor can be drafted to, and the draft shows its facts and papers.
- [ ] There is no send button anywhere. Copy and the mail link are the only ways out.
- [ ] `curl https://<domain>/api/cron/worker` without the secret returns 401.

## 6. Before you use any of it

Four answers unblock most of the product — see `docs/plan/open-questions.md`:

1. Your official AUB job title as HR records it (your current role is missing from the site without it).
2. A permanent email address (the CV will not export without one).
3. Whether the OMT role was part-time (overlapping dates block CV export otherwise).
4. Your LinkedIn, GitHub and ORCID URLs.

And two things no software can do for you: **book the IELTS or TOEFL**, and decide about **ELLIS
Institute Finland, which closes on 21 September 2026**.
