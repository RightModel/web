import { GoogleGenAI, Type } from "@google/genai";
import { logger } from "firebase-functions";
import { getRequiredSecret } from "./secrets.mjs";

const VALID_TIERS = ["routine", "moderate", "deep"];

function normalizeTier(value) {
  return VALID_TIERS.includes(value) ? value : "moderate";
}

export function buildFallbackDeepAnalysis(payload) {
  return {
    tier: normalizeTier(payload.tier),
    degraded: true
  };
}

export async function runDeepAnalysis(payload) {
  const apiKey = await getRequiredSecret("GEMINI_API_KEY");
  const taskDescription = payload.q || "";
  const model = process.env.RIGHTMODEL_VERTEX_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model,
    contents: `You classify the reasoning depth a developer task needs. Ignore prior guesses; judge the task on its own merits.

Task: ${taskDescription}

Tiers:
- routine: bounded, well-specified, solvable with standard patterns. Examples: "sort a list", "format a date", "write a regex for email", "add a null check", "rename a variable".
- moderate: multi-step work with small trade-offs, but no architectural reasoning or hidden constraints. Examples: "build a paginated REST endpoint", "add retry logic to a fetch wrapper", "refactor this function into smaller pieces".
- deep: ambiguous scope, architectural trade-offs, multi-file reasoning, failure-mode analysis, or novel/complex problems. Examples: "design a job queue with at-least-once delivery", "diagnose a flaky integration test suite", "create an operating system from scratch".

Pick the lowest tier that still fits. A task that names a single well-known algorithm or one-line change is routine even if the phrasing is terse.`,
    config: {
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tier: { type: Type.STRING, enum: VALID_TIERS }
        },
        required: ["tier"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  logger.info("deep_analysis_usage", {
    prompt_tokens: response.usageMetadata?.promptTokenCount,
    completion_tokens: response.usageMetadata?.candidatesTokenCount,
    model
  });
  return { tier: normalizeTier(parsed.tier) };
}
