import { Storage } from "@google-cloud/storage";
import { GoogleGenAI } from "@google/genai";

function validateExplanation(text) {
  if (!text) {
    return false;
  }

  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const forbidden = ["powerful", "seamless", "robust", "optimal", "approximately", "might", "could", "as an ai"];

  return (
    sentences.length >= 2 &&
    sentences.length <= 3 &&
    text.length >= 150 &&
    text.length <= 400 &&
    !forbidden.some((word) => text.toLowerCase().includes(word))
  );
}

async function generateText(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return "";
  }

  const model = process.env.RIGHTMODEL_VERTEX_MODEL || "gemini-2.5-flash";
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model,
    contents: prompt
  });

  return response.text || "";
}

export async function regenerateExplanationCache() {
  const bucketName = process.env.RIGHTMODEL_CACHE_BUCKET;

  if (!bucketName) {
    throw new Error("RIGHTMODEL_CACHE_BUCKET is required");
  }

  const baseCache = {
    generated_at: new Date().toISOString(),
    tiers: {
      all: {
        routine: {
          key: "routine-default",
          explanation:
            "This task is bounded and predictable, so a smaller model handles it without leaving quality on the table. Reaching for a larger tier here adds cost faster than it improves the output.",
          overkill_note: "A larger model is overkill here.",
          context_note: "If you are attaching a large codebase, say so. Context size can shift the recommendation.",
          blindspot_variants: [
            "Got a large codebase attached? Mention it - context size can shift this recommendation."
          ]
        },
        moderate: {
          key: "moderate-default",
          explanation:
            "This work needs synthesis and solid coding ability, but it still lives inside a clear task boundary. Moving to a frontier tier usually costs more than the extra reasoning is worth here.",
          overkill_note: "The next tier up is usually overkill for this kind of task.",
          context_note: "If this spans multiple systems or a large repo, add that context for a stronger recommendation.",
          blindspot_variants: [
            "Large repo context or hidden constraints can move this upward. Add them if they matter."
          ]
        },
        deep: {
          key: "deep-default",
          explanation:
            "The task description signals deeper reasoning, trade-off analysis, or risk-heavy judgement. A larger tier earns its cost here because it handles longer reasoning chains and ambiguity more reliably.",
          overkill_note: "This is one of the cases where paying for more reasoning is justified.",
          context_note: "If production constraints or system boundaries matter, include them - they sharpen the recommendation.",
          blindspot_variants: [
            "Deep work depends on context. Mention repo size, systems involved, or risk areas for a better answer."
          ]
        }
      },
      anthropic: {},
      google: {},
      openai: {}
    }
  };

  const prompt =
    "Write 2 short sentences explaining why a smaller model is enough for a bounded task. No marketing language.";
  const generated = await generateText(prompt);

  if (validateExplanation(generated)) {
    baseCache.tiers.all.routine.explanation = generated;
  }

  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  await bucket.file("explanations/site-build.json").save(JSON.stringify(baseCache, null, 2), {
    contentType: "application/json"
  });

  return baseCache;
}
