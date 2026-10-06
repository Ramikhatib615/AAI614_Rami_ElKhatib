/* Vercel serverless function: the only place the API key lives.
   The browser never sees it — that is the whole point of this file. */

import Anthropic from "@anthropic-ai/sdk";

export const config = { maxDuration: 60 };

const MODEL = "claude-opus-5";

/* One model, three depths. Effort trades thoroughness against tokens and
   latency within the same model, which is preferable to silently dropping
   to a weaker model to save money. "default" sits at medium so a call
   comfortably finishes inside Vercel's 60s function ceiling. */
const EFFORT = { quick: "low", default: "medium", complex: "high" };

/* Tolerant JSON extraction, mirroring the artifact runtime's behaviour:
   whole reply, else a fenced block, else first bracket to last. */
function parseJson(text) {
  const tries = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) tries.push(fence[1]);
  const first = text.search(/[[{]/);
  const last = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  if (first !== -1 && last > first) tries.push(text.slice(first, last + 1));
  for (const t of tries) {
    try { return JSON.parse(t.trim()); } catch { /* next */ }
  }
  return undefined;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      code: "sampling_disabled",
      error: "ANTHROPIC_API_KEY is not set on this deployment.",
    });
  }

  const body = req.body ?? {};
  if (body.ping) return res.status(200).json({ ok: true });

  const { prompt, tier = "default", json = false } = body;
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ code: "invalid_request", error: "prompt is required" });
  }
  if (prompt.length > 64000) {
    return res.status(400).json({ code: "prompt_too_large", error: "prompt too long" });
  }

  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT[tier] ?? "medium" },
      // A safety-classifier refusal reroutes server-side rather than
      // handing back an unusable turn.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({
        code: "refused",
        error: "Claude declined this request.",
      });
    }

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) {
      return res.status(200).json({ code: "empty_completion", error: "No text returned." });
    }

    if (json) {
      const parsed = parseJson(text);
      if (parsed === undefined) {
        return res.status(200).json({ code: "invalid_json", error: "No JSON in reply", text });
      }
      return res.status(200).json({ json: parsed, text });
    }
    return res.status(200).json({ text });
  } catch (err) {
    // Most specific first, so retryable and non-retryable stay distinguishable.
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ code: "session_expired", error: "Invalid API key." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ code: "rate_limited", error: "Rate limited — wait and retry." });
    }
    if (err instanceof Anthropic.BadRequestError) {
      return res.status(400).json({ code: "invalid_request", error: err.message });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return res.status(502).json({ code: "upstream_error", error: "Could not reach Claude." });
    }
    return res.status(500).json({ code: "upstream_error", error: err?.message || "Unknown error" });
  }
}
