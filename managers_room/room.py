"""The Managers Room: one orchestrator, several specialist managers.

Architecture (this is the whole idea):

    your request
         |
         v
    WOLF  (orchestrator, claude-opus-5)
      |  sees each manager as a TOOL and decides who to consult
      |
      +--> ask_leen(task)    --> fresh conversation w/ LEEN's system prompt
      +--> ask_sofia(task)   --> fresh conversation w/ SOFIA's system prompt
      +--> ask_yara(task)    --> ...
      |
      v
    executive brief (synthesised by WOLF, disagreements surfaced)

"agents as tools" is the key move. Each manager runs in its own isolated
conversation, so their context stays clean, they can run in parallel, and the
orchestrator only ever sees their conclusions -- not their scratch work.
"""

from __future__ import annotations

import concurrent.futures
import time

import anthropic

from roster import BY_NAME, ORCHESTRATOR_MODEL, ROSTER, Manager
from runlog import Consultation, RunLog, to_json  # noqa: F401  (re-exported)

# `fallbacks` keeps the run alive if a safety classifier declines a request:
# the server reroutes to a suitable model instead of handing back an unusable
# turn. "default" means we never maintain a model list ourselves.
FALLBACK_BETA = "server-side-fallback-2026-07-01"

WOLF_SYSTEM = """You are WOLF, the orchestrator of a managers room.

You do not do the specialist work yourself. You have a team, and each member is
available to you as a tool. Your job is threefold:

1. ROUTE. Read the request and decide which managers are genuinely needed.
   Consult two to four for most requests. Do not consult everyone reflexively --
   an irrelevant manager adds noise and cost. Do not consult nobody either:
   if the request touches their domain at all, you are guessing without them.
2. BRIEF. When you call a manager, give them the context they need and a sharp,
   specific question. A vague hand-off produces a vague answer. If two managers
   can work independently, call them in the same turn so they run in parallel.
3. SYNTHESISE. Produce one executive brief. Structure it as:

   **Read** -- two or three sentences on what is actually being asked.
   **Recommendation** -- what you would do, in priority order.
   **Tensions** -- where your managers disagreed, and how you are calling it.
     Never flatten a real disagreement into false consensus. If LAYAN flags a
     risk that blocks LEEN's plan, that tension IS the finding.
   **Open questions** -- what you would need to know to be more confident.

Attribute material claims to the manager who made them. Be decisive: the person
reading this wants a call, not a menu."""


def _text_of(response) -> str:
    """Pull the visible text out of a response, handling refusals and thinking."""
    if response.stop_reason == "refusal":
        detail = getattr(response, "stop_details", None)
        category = getattr(detail, "category", None) if detail else None
        return f"[declined by safety classifier{f': {category}' if category else ''}]"
    parts = [b.text for b in response.content if b.type == "text"]
    return "\n".join(parts).strip()


def consult(client: anthropic.Anthropic, manager: Manager, task: str) -> Consultation:
    """Run one manager as an isolated sub-agent conversation."""
    started = time.monotonic()
    try:
        kwargs = {
            "model": manager.model,
            "max_tokens": 8000,
            "system": manager.system,
            "messages": [{"role": "user", "content": task}],
            # Adaptive thinking: the model decides how much to reason. Note
            # there is no budget_tokens on current models -- it is rejected.
            "thinking": {"type": "adaptive"},
            "output_config": {"effort": "medium"},
            "betas": [FALLBACK_BETA],
            "fallbacks": "default",
        }
        if manager.server_tools:
            kwargs["tools"] = manager.server_tools

        response = client.beta.messages.create(**kwargs)

        # A manager with web_search may stop on pause_turn mid-search.
        # Resume until it finishes, with a hard cap so we cannot spin.
        resumes = 0
        messages = list(kwargs["messages"])
        while response.stop_reason == "pause_turn" and resumes < 3:
            messages.append({"role": "assistant", "content": response.content})
            response = client.beta.messages.create(**{**kwargs, "messages": messages})
            resumes += 1

        return Consultation(
            manager=manager.name,
            display=manager.display,
            title=manager.title,
            task=task,
            answer=_text_of(response) or "[no text returned]",
            seconds=time.monotonic() - started,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
    except anthropic.APIError as exc:
        return Consultation(
            manager=manager.name,
            display=manager.display,
            title=manager.title,
            task=task,
            answer="",
            seconds=time.monotonic() - started,
            error=f"{type(exc).__name__}: {exc}",
        )


def _manager_tools() -> list[dict]:
    """Expose every manager on the roster as a tool WOLF can call."""
    return [
        {
            "name": f"ask_{m.name}",
            "description": (
                f"Consult {m.display}, {m.title}. Their domain: {m.domain}. "
                f"Pass a specific question plus the context they need -- they "
                f"cannot see the original request or any other manager's answer."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": "The self-contained question and context for this manager.",
                    }
                },
                "required": ["task"],
                "additionalProperties": False,
            },
            "strict": True,
        }
        for m in ROSTER
    ]


def run(request: str, *, max_rounds: int = 6, verbose: bool = True) -> RunLog:
    """Send a request into the room and get back a brief plus a full run log."""
    client = anthropic.Anthropic()
    log = RunLog(request=request)
    started = time.monotonic()

    tools = _manager_tools()
    messages: list[dict] = [{"role": "user", "content": request}]

    for round_no in range(1, max_rounds + 1):
        log.rounds = round_no
        response = client.beta.messages.create(
            model=ORCHESTRATOR_MODEL,
            max_tokens=16000,
            system=WOLF_SYSTEM,
            messages=messages,
            tools=tools,
            thinking={"type": "adaptive"},
            output_config={"effort": "high"},
            betas=[FALLBACK_BETA],
            fallbacks="default",
        )

        if response.stop_reason == "refusal":
            log.brief = _text_of(response)
            break

        if response.stop_reason == "end_turn":
            log.brief = _text_of(response)
            break

        calls = [b for b in response.content if b.type == "tool_use"]
        if not calls:
            log.brief = _text_of(response)
            break

        messages.append({"role": "assistant", "content": response.content})

        if verbose:
            who = ", ".join(c.name.removeprefix("ask_").upper() for c in calls)
            print(f"  round {round_no}: WOLF consults {who}")

        # Managers are independent, so run them concurrently. All results must
        # come back in ONE user message -- splitting them teaches the model to
        # stop making parallel calls.
        def dispatch(call):
            name = call.name.removeprefix("ask_")
            manager = BY_NAME.get(name)
            # Tool inputs are JSON -- always parse/index, never string-match.
            task = call.input.get("task", "") if isinstance(call.input, dict) else ""
            if manager is None:
                return call, Consultation(
                    manager=name, display=name.upper(), title="unknown",
                    task=task, answer="", seconds=0.0,
                    error=f"no manager named {name!r} on the roster",
                )
            return call, consult(client, manager, task)

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(calls)) as pool:
            for call, consultation in pool.map(dispatch, calls):
                log.consultations.append(consultation)
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": consultation.error or consultation.answer,
                        **({"is_error": True} if consultation.error else {}),
                    }
                )
        messages.append({"role": "user", "content": results})
    else:
        log.brief = (
            f"[stopped after {max_rounds} rounds without a final brief -- "
            "raise max_rounds or narrow the request]"
        )

    log.seconds = time.monotonic() - started
    return log
