import { Storage } from "@google-cloud/storage";

const DEFAULT_SNAPSHOT = {
  retrieved_at: new Date().toISOString(),
  models: {
    anthropic: {
      "claude-haiku-3-5": {
        tier: "routine",
        label: "Claude Haiku 3.5",
        input_cost_per_1k_tokens_usd: 0.0008,
        output_cost_per_1k_tokens_usd: 0.004,
        context_window_k: 200
      },
      "claude-sonnet-4": {
        tier: "moderate",
        label: "Claude Sonnet 4",
        input_cost_per_1k_tokens_usd: 0.003,
        output_cost_per_1k_tokens_usd: 0.015,
        context_window_k: 200
      },
      "claude-opus-4": {
        tier: "deep",
        label: "Claude Opus 4",
        input_cost_per_1k_tokens_usd: 0.015,
        output_cost_per_1k_tokens_usd: 0.075,
        context_window_k: 200
      }
    },
    google: {
      "gemini-flash-2-0": {
        tier: "routine",
        label: "Gemini Flash 2.0",
        input_cost_per_1k_tokens_usd: 0.0001,
        output_cost_per_1k_tokens_usd: 0.0004,
        context_window_k: 1000
      },
      "gemini-pro-2-5": {
        tier: "moderate",
        label: "Gemini Pro 2.5",
        input_cost_per_1k_tokens_usd: 0.00125,
        output_cost_per_1k_tokens_usd: 0.005,
        context_window_k: 1000
      }
    },
    openai: {
      "gpt-4o-mini": {
        tier: "routine",
        label: "GPT-4o mini",
        input_cost_per_1k_tokens_usd: 0.00015,
        output_cost_per_1k_tokens_usd: 0.0006,
        context_window_k: 128
      },
      "gpt-4o": {
        tier: "moderate",
        label: "GPT-4o",
        input_cost_per_1k_tokens_usd: 0.0025,
        output_cost_per_1k_tokens_usd: 0.01,
        context_window_k: 128
      }
    }
  }
};

export async function refreshPricingSnapshot() {
  const bucketName = process.env.RIGHTMODEL_CACHE_BUCKET;

  if (!bucketName) {
    throw new Error("RIGHTMODEL_CACHE_BUCKET is required");
  }

  const snapshot = {
    ...DEFAULT_SNAPSHOT,
    retrieved_at: new Date().toISOString()
  };

  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const date = snapshot.retrieved_at.slice(0, 10);
  const file = bucket.file(`pricing/models-${date}.json`);
  await file.save(JSON.stringify(snapshot, null, 2), {
    contentType: "application/json"
  });

  return snapshot;
}
