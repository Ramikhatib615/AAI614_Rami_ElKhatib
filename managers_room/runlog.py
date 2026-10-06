"""Run-log data types. Deliberately free of any SDK dependency so the
dashboard and demo mode can be used without `anthropic` installed."""

from __future__ import annotations

import json
from dataclasses import dataclass, field


@dataclass
class Consultation:
    """One manager's turn, recorded for the dashboard."""
    manager: str
    display: str
    title: str
    task: str
    answer: str
    seconds: float
    input_tokens: int = 0
    output_tokens: int = 0
    error: str | None = None


@dataclass
class RunLog:
    request: str
    consultations: list[Consultation] = field(default_factory=list)
    brief: str = ""
    seconds: float = 0.0
    rounds: int = 0

    @property
    def total_tokens(self) -> int:
        return sum(c.input_tokens + c.output_tokens for c in self.consultations)


def to_json(log: RunLog) -> str:
    return json.dumps(
        {
            "request": log.request,
            "brief": log.brief,
            "seconds": round(log.seconds, 2),
            "rounds": log.rounds,
            "total_tokens": log.total_tokens,
            "consultations": [
                {
                    "manager": c.display,
                    "title": c.title,
                    "task": c.task,
                    "answer": c.answer,
                    "seconds": round(c.seconds, 2),
                    "tokens": c.input_tokens + c.output_tokens,
                    "error": c.error,
                }
                for c in log.consultations
            ],
        },
        indent=2,
    )
