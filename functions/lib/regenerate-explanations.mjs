import { Storage } from "@google-cloud/storage";
import { GoogleGenAI } from "@google/genai";

const DEFAULT_TIER_COPY = {
  routine: {
    key: "routine-default",
    explanation:
      "This task is bounded and predictable, so a smaller model handles it without leaving quality on the table. Reaching for a larger tier here adds cost faster than it improves the output.",
    overkill_note: "A larger model is overkill here.",
    context_note: "If you are attaching a large codebase, say so. Context size can shift the recommendation.",
    blindspot_variants: [
      "Got a large codebase attached? Mention it - context size can shift this recommendation.",
      "If there is more context than fits in one sentence, paste it here - that can change the pick.",
      "A bigger codebase or longer prompt can change the answer. Mention that context if it matters."
    ]
  },
  moderate: {
    key: "moderate-default",
    explanation:
      "This work needs synthesis and solid coding ability, but it still lives inside a clear task boundary. Moving to a frontier tier usually costs more than the extra reasoning is worth here.",
    overkill_note: "The next tier up is usually overkill for this kind of task.",
    context_note: "If this spans multiple systems or a large repo, add that context for a stronger recommendation.",
    blindspot_variants: [
      "If this touches multiple systems, say that plainly - it may justify a larger model.",
      "Large repo context or hidden constraints can move this upward. Add them if they matter.",
      "This recommendation is based on the task description only. Extra codebase context can shift it."
    ]
  },
  deep: {
    key: "deep-default",
    explanation:
      "The task description signals deeper reasoning, trade-off analysis, or risk-heavy judgement. A larger tier earns its cost here because it handles longer reasoning chains and ambiguity more reliably.",
    overkill_note: "This is one of the cases where paying for more reasoning is justified.",
    context_note: "If production constraints or system boundaries matter, include them - they sharpen the recommendation.",
    blindspot_variants: [
      "If there are hard constraints like latency, team size, or migration risk, add them for a tighter read.",
      "System boundaries and production constraints matter here. Include them if you have them.",
      "Deep work depends on context. Mention repo size, systems involved, or risk areas for a better answer."
    ]
  }
};

const PROMPT_CONFIG = {
  routine: {
    recommended: "Claude Haiku 3.5, Gemini Flash 2.0, or GPT-4o mini",
    overkill: "Claude Sonnet 4"
  },
  moderate: {
    recommended: "Claude Sonnet 4, Gemini Pro 2.5, or GPT-4o",
    overkill: "Claude Opus 4"
  },
  deep: {
    recommended: "Claude Opus 4",
    overkill: "Claude Sonnet 4"
  }
};

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
    contents: prompt,
    config: {
      maxOutputTokens: 220,
      temperature: 0.3
    }
  });

  return response.text || "";
}

async function generateTierExplanation(tier) {
  const config = PROMPT_CONFIG[tier];
  const prompt = `You are writing concise explanation copy for rightmodel.dev.

Tier: ${tier}
Recommended models: ${config.recommended}
Overkill model: ${config.overkill}

Write exactly 2 to 3 sentences. Explain why this task class fits the recommended tier and why the larger option adds cost without enough benefit. Avoid marketing language and avoid hedging.`;
  const generated = await generateText(prompt);

  return validateExplanation(generated) ? generated : "";
}

function cloneForProvider(provider, copy) {
  return {
    ...copy,
    key: `${copy.key}-${provider}`
  };
}

export async function regenerateExplanationCache() {
  const bucketName = process.env.RIGHTMODEL_CACHE_BUCKET;

  if (!bucketName) {
    throw new Error("RIGHTMODEL_CACHE_BUCKET is required");
  }

  const generatedAt = new Date().toISOString();
  const allTiers = structuredClone(DEFAULT_TIER_COPY);

  for (const tier of Object.keys(DEFAULT_TIER_COPY)) {
    const generated = await generateTierExplanation(tier);

    if (generated) {
      allTiers[tier].explanation = generated;
    }
  }

  const baseCache = {
    generated_at: generatedAt,
    tiers: {
      all: allTiers,
      anthropic: {
        routine: cloneForProvider("anthropic", allTiers.routine),
        moderate: cloneForProvider("anthropic", allTiers.moderate),
        deep: cloneForProvider("anthropic", allTiers.deep)
      },
      google: {
        routine: cloneForProvider("google", allTiers.routine),
        moderate: cloneForProvider("google", allTiers.moderate),
        deep: cloneForProvider("google", allTiers.deep)
      },
      openai: {
        routine: cloneForProvider("openai", allTiers.routine),
        moderate: cloneForProvider("openai", allTiers.moderate),
        deep: cloneForProvider("openai", allTiers.deep)
      }
    }
  };

  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  await bucket.file("explanations/site-build.json").save(JSON.stringify(baseCache, null, 2), {
    contentType: "application/json"
  });

  for (const tier of Object.keys(allTiers)) {
    await bucket.file(`explanations/${tier}-default.json`).save(JSON.stringify(allTiers[tier], null, 2), {
      contentType: "application/json"
    });
  }

  return baseCache;
}
