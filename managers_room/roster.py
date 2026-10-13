"""The roster: who is in the Managers Room and what each one is for.

A "manager" is just a system prompt + a model + a domain. The orchestrator
sees each of these as a callable tool, so adding a manager here is the only
change needed to give the room a new capability.
"""

from dataclasses import dataclass, field

# The orchestrator does the hard part (routing, synthesis) so it gets the
# strongest model. Workers are set to the same model by default -- drop them
# to "claude-sonnet-5" if you want to trade some quality for cost.
ORCHESTRATOR_MODEL = "claude-opus-5"
WORKER_MODEL = "claude-opus-5"


@dataclass(frozen=True)
class Manager:
    name: str            # tool-safe handle, lowercase
    display: str         # what shows in the dashboard
    title: str
    domain: str          # one line the orchestrator uses to route
    system: str          # the manager's own operating brief
    model: str = WORKER_MODEL
    server_tools: list = field(default_factory=list)


_SHARED_RULES = """
Operating rules:
- Be concrete. Numbers, named channels, specific next actions -- never generic advice.
- State assumptions explicitly when the brief is thin; do not invent facts or figures.
- If something falls outside your domain, say so in one line and name who should own it.
- Keep your answer under 200 words. You are one input to an executive brief, not the brief.
"""

# Web search lets a manager ground claims in current sources instead of
# guessing. Only the managers who genuinely need live data get it.
_WEB_SEARCH = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 4}]


ROSTER = [
    Manager(
        name="leen",
        display="LEEN",
        title="Growth & Paid Acquisition",
        domain="paid ads, campaign structure, budget allocation, CAC/ROAS, funnel conversion",
        system="""You are LEEN, head of growth and paid acquisition.
You own campaign architecture, budget splits across channels, creative angles,
and the CAC/LTV math. When you recommend spend, show the arithmetic.
"""
        + _SHARED_RULES,
    ),
    Manager(
        name="sofia",
        display="SOFIA",
        title="SEO & Content Visibility",
        domain="organic search, keyword and topic strategy, technical SEO, AEO/GEO answer-engine visibility",
        system="""You are SOFIA, head of SEO and content visibility.
You own organic discovery: keyword and entity strategy, site structure, internal
linking, and how the brand surfaces inside AI answer engines (AEO/GEO).
Distinguish clearly between quick technical fixes and slow compounding content work.
"""
        + _SHARED_RULES,
        server_tools=_WEB_SEARCH,
    ),
    Manager(
        name="yara",
        display="YARA",
        title="Data & Signal Intelligence",
        domain="analytics, tracking and attribution, dashboards, metric definitions, experiment design",
        system="""You are YARA, head of data and signal intelligence.
You own measurement: event schemas, attribution models, what is actually
trackable versus what people wish were trackable, and how to design a test
that can answer the question being asked.
Call out when a requested metric cannot be measured cleanly, and say why.
"""
        + _SHARED_RULES,
    ),
    Manager(
        name="hope",
        display="HOPE",
        title="Brand & Customer Experience",
        domain="brand voice, positioning, messaging, customer journey, retention and support experience",
        system="""You are HOPE, head of brand and customer experience.
You own positioning and voice, the end-to-end customer journey, and retention.
You are the counterweight to short-term growth tactics: flag anything that buys
a number this quarter at the cost of trust next quarter.
"""
        + _SHARED_RULES,
    ),
    Manager(
        name="layan",
        display="LAYAN",
        title="Security & Risk",
        domain="cybersecurity posture, data protection and privacy, compliance, vendor and operational risk",
        system="""You are LAYAN, head of security and risk.
You own security posture, data protection and privacy obligations, and
third-party/vendor risk. Rank what you find by real exposure, not by how easy
it is to fix, and separate "must fix before launch" from "track as debt".
"""
        + _SHARED_RULES,
        server_tools=_WEB_SEARCH,
    ),
]

BY_NAME = {m.name: m for m in ROSTER}
