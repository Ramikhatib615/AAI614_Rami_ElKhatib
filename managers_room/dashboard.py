"""Render a RunLog as a self-contained 'Managers Room' HTML page."""

from __future__ import annotations

import html
import re
from pathlib import Path

from runlog import RunLog
from roster import ROSTER

_CSS = """
:root{--bg:#f7f7f5;--card:#fff;--ink:#1a1a18;--muted:#6b6b66;--line:#e3e3de;
--accent:#b4472a;--ok:#2f6f4f;--warn:#a8601b}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){
--bg:#14140f;--card:#1e1e1a;--ink:#f0efe9;--muted:#9a9a92;--line:#33332c;
--accent:#e0785a;--ok:#6fbf92;--warn:#d99a4e}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:32px 20px 72px}
h1{font-size:1.6rem;margin:0 0 4px;letter-spacing:-.02em}
.sub{color:var(--muted);font-size:.85rem;margin:0 0 28px}
.ask{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);
border-radius:8px;padding:16px 18px;margin:0 0 28px}
.ask h2{font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;
color:var(--muted);margin:0 0 8px;font-weight:600}
.stats{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 28px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:8px;
padding:10px 16px;flex:1 1 110px}
.stat b{display:block;font-size:1.3rem;letter-spacing:-.02em}
.stat span{font-size:.7rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
h2.sec{font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;
color:var(--muted);margin:32px 0 12px;font-weight:600}
.roster{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.chip{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:11px 13px}
.chip.on{border-color:var(--accent)}
.chip b{display:block;font-size:.82rem;letter-spacing:.04em}
.chip span{font-size:.7rem;color:var(--muted)}
.chip .dot{display:inline-block;width:6px;height:6px;border-radius:50%;
background:var(--line);margin-right:6px;vertical-align:1px}
.chip.on .dot{background:var(--ok)}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;
padding:16px 18px;margin:0 0 12px}
.card header{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:10px}
.card header b{font-size:.85rem;letter-spacing:.05em}
.card header em{color:var(--muted);font-style:normal;font-size:.78rem}
.card header .meta{margin-left:auto;color:var(--muted);font-size:.72rem;
font-variant-numeric:tabular-nums}
.task{color:var(--muted);font-size:.82rem;border-left:2px solid var(--line);
padding-left:11px;margin:0 0 11px}
.err{color:var(--warn)}
.brief{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--accent);
border-radius:8px;padding:20px 22px}
.brief h3{font-size:.95rem;margin:20px 0 6px}.brief h3:first-child{margin-top:0}
.brief p{margin:0 0 10px}.brief ul{margin:0 0 10px;padding-left:22px}
code{background:var(--bg);padding:1px 5px;border-radius:4px;font-size:.88em}
footer{margin-top:40px;color:var(--muted);font-size:.74rem;text-align:center}
"""


_BULLET = re.compile(r"^\s*[-*]\s+")
_HEADING = re.compile(r"^#+\s*")


def _md(text: str) -> str:
    """Minimal markdown -> HTML: bold, headings, bullets, paragraphs."""
    out = []
    for block in re.split(r"\n\s*\n", html.escape(text.strip())):
        block = block.strip()
        if not block:
            continue
        block = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", block)
        block = re.sub(r"`(.+?)`", r"<code>\1</code>", block)
        lines = block.split("\n")
        if all(_BULLET.match(ln) for ln in lines):
            items = "".join("<li>" + _BULLET.sub("", ln) + "</li>" for ln in lines)
            out.append(f"<ul>{items}</ul>")
        elif len(lines) == 1 and re.match(r"^(<strong>.+</strong>|#+\s)", block):
            out.append("<h3>" + _HEADING.sub("", block) + "</h3>")
        else:
            out.append(f"<p>{'<br>'.join(lines)}</p>")
    return "\n".join(out)


def render(log: RunLog) -> str:
    consulted = {c.display for c in log.consultations}

    chips = "".join(
        f'<div class="chip{" on" if m.display in consulted else ""}">'
        f'<b><span class="dot"></span>{html.escape(m.display)}</b>'
        f"<span>{html.escape(m.title)}</span></div>"
        for m in ROSTER
    )

    cards = []
    for c in log.consultations:
        body = (
            f'<p class="err">{html.escape(c.error)}</p>' if c.error else _md(c.answer)
        )
        cards.append(
            f'<div class="card"><header><b>{html.escape(c.display)}</b>'
            f"<em>{html.escape(c.title)}</em>"
            f'<span class="meta">{c.seconds:.1f}s &middot; '
            f"{c.input_tokens + c.output_tokens:,} tok</span></header>"
            f'<p class="task">{html.escape(c.task)}</p>{body}</div>'
        )

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Managers Room</title><style>{_CSS}</style></head><body><div class="wrap">
<h1>Managers Room</h1>
<p class="sub">WOLF orchestrating {len(ROSTER)} specialist managers</p>

<div class="ask"><h2>Request</h2>{_md(log.request)}</div>

<div class="stats">
<div class="stat"><b>{len(log.consultations)}</b><span>consults</span></div>
<div class="stat"><b>{log.rounds}</b><span>rounds</span></div>
<div class="stat"><b>{log.seconds:.0f}s</b><span>elapsed</span></div>
<div class="stat"><b>{log.total_tokens:,}</b><span>worker tokens</span></div>
</div>

<h2 class="sec">Roster</h2><div class="roster">{chips}</div>

<h2 class="sec">Consultations</h2>{"".join(cards) or "<p>None.</p>"}

<h2 class="sec">Executive brief &mdash; WOLF</h2>
<div class="brief">{_md(log.brief)}</div>

<footer>Generated by the Managers Room &middot; orchestrator + agents-as-tools</footer>
</div></body></html>"""


def write(log: RunLog, path: str | Path) -> Path:
    path = Path(path)
    path.write_text(render(log), encoding="utf-8")
    return path
