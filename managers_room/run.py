"""CLI for the Managers Room.

    python run.py "Should we launch in Lebanon next quarter?"
    python run.py --demo          # canned data, no API key, no cost
    python run.py "..." --json out.json --html room.html
"""

from __future__ import annotations

import argparse
import os
import sys


def _demo_log():
    """A canned run so you can see the shape of the output without an API key."""
    from runlog import Consultation, RunLog

    log = RunLog(
        request="We have $40k for Q1. Should we push paid ads or fix our organic presence first?",
        rounds=2,
        seconds=31.4,
    )
    log.consultations = [
        Consultation(
            manager="leen", display="LEEN", title="Growth & Paid Acquisition",
            task="We have $40k for Q1. Make the case for paid, with a budget split and expected CAC.",
            answer=(
                "**Paid is the right first move, but not all $40k.**\n\n"
                "- Split: $24k search (high intent, fastest signal), $10k Meta "
                "(retargeting + lookalikes), $6k held as a creative test fund.\n"
                "- At a $2.80 blended CPC and 3% landing conversion, $24k buys "
                "~8,500 clicks and ~255 leads, i.e. **~$94 CPL**.\n"
                "- Paid earns its place here because it produces demand data in "
                "three weeks. Organic will not tell you what converts until month four.\n\n"
                "Assumption: no existing conversion baseline was given, so the 3% "
                "is an industry mid-point. If your current rate is under 1.5%, fix "
                "the landing page before spending a dinar."
            ),
            seconds=8.2, input_tokens=420, output_tokens=310,
        ),
        Consultation(
            manager="sofia", display="SOFIA", title="SEO & Content Visibility",
            task="Same $40k question from the organic side. What is winnable in one quarter?",
            answer=(
                "**Do not fund organic as a Q1 revenue channel. Fund it as a Q1 asset.**\n\n"
                "- Technical fixes are cheap and fast: crawl errors, page speed, "
                "schema markup. Roughly $4k of contractor time, results in 3-6 weeks.\n"
                "- Content ranking is a 4-8 month curve. Money spent on articles in "
                "January shows up in revenue around August.\n"
                "- The underrated piece is AEO: AI answer engines cite structured, "
                "clearly-sourced pages. That work compounds and almost nobody local "
                "is doing it yet.\n\n"
                "My call: $6k to technical SEO and entity/schema work now. Anything "
                "beyond that competes with paid for the same quarter and loses."
            ),
            seconds=11.7, input_tokens=455, output_tokens=340,
        ),
        Consultation(
            manager="yara", display="YARA", title="Data & Signal Intelligence",
            task="How would we measure which of these actually worked, given we are doing both?",
            answer=(
                "**Right now you cannot measure either cleanly. Fix that first.**\n\n"
                "- If paid and organic run simultaneously with no holdout, you will "
                "attribute organic lift to paid. That is the single most common way "
                "this decision gets evaluated wrong.\n"
                "- Minimum viable setup: server-side conversion events, UTM discipline, "
                "and a geo holdout — exclude one comparable region from paid entirely.\n"
                "- $94 CPL from LEEN is a *reported* number, not an incremental one. "
                "Expect true incremental CPL to be 20-40% higher.\n\n"
                "Cost: about $3k of engineering time, one week. Do it before the spend "
                "starts, because it cannot be applied retroactively."
            ),
            seconds=9.1, input_tokens=430, output_tokens=325,
        ),
    ]
    log.brief = (
        "**Read**\n"
        "The question is framed as paid *versus* organic, but that framing is the "
        "problem. These operate on different time horizons, so they are not competing "
        "for the same outcome — they are competing for the same $40k. The real question "
        "is what you need to know by the end of Q1.\n\n"
        "**Recommendation**\n"
        "- **Week 1 — spend $3k on measurement (YARA).** Non-negotiable and it gates "
        "everything else. Without a geo holdout you will end Q1 with numbers you cannot "
        "trust, which is worse than ending it with fewer numbers.\n"
        "- **Weeks 1-3 — $6k to technical SEO and schema work (SOFIA).** Cheap, fast, "
        "and it compounds. This is not a Q1 revenue bet; it is buying an asset while it "
        "is still underpriced.\n"
        "- **Weeks 2-12 — $25k to paid, not the $34k LEEN asked for.** Start at $24k "
        "search-led per her split, hold $6k as the creative test fund, and keep the "
        "remaining $6k unallocated until the holdout data lands in week 6.\n\n"
        "**Tensions**\n"
        "LEEN wants the majority of the budget on paid because it returns signal fastest. "
        "YARA's point undercuts her headline number: the $94 CPL is reported, not "
        "incremental, and the honest figure is likely $115-130. I am siding with YARA on "
        "the measurement spend and with LEEN on the direction. Paid still wins Q1 — but "
        "at a lower advertised ROI than the pitch implies, and I would rather know that "
        "in week 6 than argue about it in April.\n\n"
        "SOFIA and LEEN are less in conflict than they appear. SOFIA explicitly declined "
        "to compete for Q1 revenue, which resolves most of it.\n\n"
        "**Open questions**\n"
        "- What is your actual current landing-page conversion rate? LEEN's entire model "
        "rests on an assumed 3%. Below 1.5% and this plan inverts — fix the page first.\n"
        "- Is $40k the whole year's marketing budget or Q1's slice? If it is the year, "
        "the paid number is too aggressive.\n"
        "- Nobody was asked about sales capacity. 255 leads is worthless if no one can "
        "call them."
    )
    return log


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        prog="run.py", description="Send a request into the Managers Room."
    )
    ap.add_argument("request", nargs="?", help="the business question to route")
    ap.add_argument("--demo", action="store_true",
                    help="render canned output; no API key needed, costs nothing")
    ap.add_argument("--html", metavar="PATH", default="room.html",
                    help="write the dashboard here (default: room.html)")
    ap.add_argument("--json", metavar="PATH", help="also write the raw run log as JSON")
    ap.add_argument("--no-html", action="store_true", help="skip the dashboard")
    ap.add_argument("--max-rounds", type=int, default=6)
    args = ap.parse_args(argv)

    if args.demo:
        log = _demo_log()
        print("Demo mode — canned data, no API calls made.\n")
    else:
        if not args.request:
            ap.error("give a request, or pass --demo to see example output")
        if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
            print(
                "No ANTHROPIC_API_KEY found in the environment.\n"
                "  export ANTHROPIC_API_KEY=sk-ant-...   (or run: ant auth login)\n"
                "Or try:  python run.py --demo\n",
                file=sys.stderr,
            )
            return 2
        import room

        print(f'Request: "{args.request}"\n')
        log = room.run(args.request, max_rounds=args.max_rounds)

    print("\n" + "=" * 70)
    print("EXECUTIVE BRIEF — WOLF")
    print("=" * 70 + "\n")
    print(log.brief)
    print(
        f"\n{'-' * 70}\n{len(log.consultations)} consults · {log.rounds} rounds · "
        f"{log.seconds:.1f}s · {log.total_tokens:,} worker tokens"
    )

    if args.json:
        from pathlib import Path

        import runlog

        Path(args.json).write_text(runlog.to_json(log), encoding="utf-8")
        print(f"json  -> {args.json}")

    if not args.no_html:
        import dashboard

        print(f"html  -> {dashboard.write(log, args.html)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
