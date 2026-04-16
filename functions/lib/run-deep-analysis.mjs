import { GoogleGenAI } from "@google/genai";

export async function runDeepAnalysis(payload) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required");
  }

  const taskDescription = payload.q || "";
  const matchedSignals = Array.isArray(payload.matchedSignals) ? payload.matchedSignals.join(", ") : "";
  const modelLabel = payload.model || "recommended model";
  const model = process.env.RIGHTMODEL_VERTEX_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model,
    contents: `You are writing copy for rightmodel.dev.

Task description: ${taskDescription}
Matched signals: ${matchedSignals}
Recommended model: ${modelLabel}

Write exactly 2 to 3 sentences. Be direct, calm, and specific. Explain why this task needs deeper reasoning and what the larger model handles better. Do not use marketing language.`,
    config: {
      maxOutputTokens: 220,
      temperature: 0.3
    }
  });

  return {
    explanation: response.text || ""
  };
}
