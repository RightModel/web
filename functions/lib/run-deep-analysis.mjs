import { GoogleGenAI } from "@google/genai";
import { getRequiredSecret } from "./secrets.mjs";

function normalizeTier(value) {
  return value === "routine" || value === "moderate" || value === "deep" ? value : "moderate";
}

function summarizeSignals(signals) {
  const cleaned = signals
    .map((signal) => String(signal || "").trim())
    .filter(Boolean)
    .slice(0, 2);

  if (cleaned.length === 0) {
    return "";
  }

  if (cleaned.length === 1) {
    return cleaned[0];
  }

  return `${cleaned[0]} and ${cleaned[1]}`;
}

function normalizeSignals(signals) {
  if (!Array.isArray(signals)) {
    return [];
  }

  return signals.map((signal) => String(signal || "").trim()).filter(Boolean).slice(0, 4);
}

function parseDeepAnalysisResponse(text) {
  const trimmed = String(text || "").trim();

  if (!trimmed) {
    throw new Error("Deep analysis returned empty text");
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Deep analysis did not return JSON");
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1));
  const explanation = typeof parsed.explanation === "string" ? parsed.explanation.trim() : "";
  const tier = typeof parsed.tier === "string" ? parsed.tier.trim() : "";

  if (!explanation) {
    throw new Error("Deep analysis explanation missing");
  }

  if (tier !== "routine" && tier !== "moderate" && tier !== "deep") {
    throw new Error("Deep analysis tier missing");
  }

  return {
    tier,
    explanation,
    signals: normalizeSignals(parsed.signals)
  };
}

function buildFallbackOpening(payload) {
  const tier = normalizeTier(payload.tier);
  const signals = Array.isArray(payload.matchedSignals) ? payload.matchedSignals : [];
  const summarizedSignals = summarizeSignals(signals);

  if (signals.includes("ambiguous scope")) {
    return "The short prompt leaves room for hidden constraints, so a deeper pass helps test a couple of plausible interpretations before locking in the recommendation.";
  }

  if (summarizedSignals) {
    return `This task deserves a deeper pass because ${summarizedSignals} points to more than a quick one-shot answer.`;
  }

  if (tier === "deep") {
    return "This task looks like higher-stakes reasoning work, so a deeper pass helps surface trade-offs and failure modes before you commit to a direction.";
  }

  if (tier === "routine") {
    return "This still looks like a bounded task, but a deeper pass is useful when there may be off-screen context that could change a fast heuristic pick.";
  }

  return "This task sits in the middle ground where hidden constraints can change the best model choice, so a deeper pass helps verify the first recommendation.";
}

function buildFallbackCloser(payload) {
  const tier = normalizeTier(payload.tier);
  const modelLabel = typeof payload.model === "string" && payload.model.trim() ? payload.model.trim() : "the recommended model";

  if (tier === "deep") {
    return `${modelLabel} earns the extra cost here because it can hold onto more moving parts, reason through trade-offs, and surface risks before answering.`;
  }

  if (tier === "routine") {
    return `${modelLabel} is still a safe fit when extra context shows up because it can absorb that context without jumping straight to the most expensive tier.`;
  }

  return `${modelLabel} is the safer fit here because it can keep the moving parts aligned, compare a few plausible approaches, and still stay cost-conscious.`;
}

export function buildFallbackDeepAnalysis(payload) {
  return {
    tier: normalizeTier(payload.tier),
    explanation: `${buildFallbackOpening(payload)} ${buildFallbackCloser(payload)}`,
    signals: normalizeSignals(payload.matchedSignals),
    degraded: true
  };
}

export async function runDeepAnalysis(payload) {
  const apiKey = await getRequiredSecret("GEMINI_API_KEY");
  const taskDescription = payload.q || "";
  const matchedSignals = Array.isArray(payload.matchedSignals) ? payload.matchedSignals.join(", ") : "";
  const modelLabel = payload.model || "recommended model";
  const provider = payload.provider || "all";
  const tier = normalizeTier(payload.tier);
  const model = process.env.RIGHTMODEL_VERTEX_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model,
    contents: `You are writing copy for rightmodel.dev.

Task description: ${taskDescription}
Provider filter: ${provider}
Initial recommendation: ${modelLabel} (${tier})
Matched signals: ${matchedSignals}

Return JSON with these keys:
- tier: one of "routine", "moderate", or "deep"
- explanation: 2 to 3 sentences. The first sentence must say whether the recommendation is staying the same or changing. If it changes, name both the previous and revised recommendation.
- signals: 2 to 4 short phrases that capture the most relevant signals in the task description.

Be direct, calm, and specific. Explain why this task needs deeper reasoning and what the revised recommendation handles better. Do not use marketing language or markdown.`,
    config: {
      maxOutputTokens: 220,
      temperature: 0.3
    }
  });

  const payload = parseDeepAnalysisResponse(response.text || "");

  return {
    tier: payload.tier,
    explanation: payload.explanation,
    signals: payload.signals
  };
}
