import { GoogleGenAI, Type } from "@google/genai";
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
  const heuristicTier = normalizeTier(payload.tier);
  const matchedSignals = Array.isArray(payload.matchedSignals) ? payload.matchedSignals.join(", ") : "";
  const model = process.env.RIGHTMODEL_VERTEX_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model,
    contents: `Classify the reasoning depth this developer task needs.

Task: ${taskDescription}
Heuristic signals: ${matchedSignals || "(none)"}
Heuristic tier: ${heuristicTier}

Pick one tier:
- routine: bounded, well-defined, single-step work (formatting, simple lookups, boilerplate).
- moderate: multi-step work with some trade-offs, but no deep reasoning over hidden constraints.
- deep: ambiguous scope, architectural trade-offs, multi-file reasoning, or failure modes to weigh.

Return only the tier.`,
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
  return { tier: normalizeTier(parsed.tier) };
}
