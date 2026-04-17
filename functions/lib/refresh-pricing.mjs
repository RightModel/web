import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Storage } from "@google-cloud/storage";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const __dirname = dirname(fileURLToPath(import.meta.url));
const tierMappingPath = resolve(__dirname, "tier-mapping.generated.json");

const DEFAULT_SNAPSHOT = {
  source: "openrouter",
  retrieved_at: new Date().toISOString(),
  models: {
    "anthropic/claude-3.5-haiku": {
      tier: "routine",
      label: "Claude 3.5 Haiku",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.0008,
      output_cost_per_1k_tokens_usd: 0.004,
      context_window_k: 200
    },
    "anthropic/claude-3.7-sonnet": {
      tier: "moderate",
      label: "Claude 3.7 Sonnet",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.003,
      output_cost_per_1k_tokens_usd: 0.015,
      context_window_k: 200
    },
    "anthropic/claude-haiku-4.5": {
      tier: "routine",
      label: "Claude Haiku 4.5",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.001,
      output_cost_per_1k_tokens_usd: 0.005,
      context_window_k: 200
    },
    "anthropic/claude-opus-4": {
      tier: "deep",
      label: "Claude Opus 4",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.015,
      output_cost_per_1k_tokens_usd: 0.075,
      context_window_k: 200
    },
    "anthropic/claude-opus-4.5": {
      tier: "deep",
      label: "Claude Opus 4.5",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.005,
      output_cost_per_1k_tokens_usd: 0.025,
      context_window_k: 200
    },
    "anthropic/claude-opus-4.6": {
      tier: "deep",
      label: "Claude Opus 4.6",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.005,
      output_cost_per_1k_tokens_usd: 0.025,
      context_window_k: 1000
    },
    "anthropic/claude-opus-4.7": {
      tier: "deep",
      label: "Claude Opus 4.7",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.005,
      output_cost_per_1k_tokens_usd: 0.025,
      context_window_k: 1000
    },
    "anthropic/claude-sonnet-4": {
      tier: "moderate",
      label: "Claude Sonnet 4",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.003,
      output_cost_per_1k_tokens_usd: 0.015,
      context_window_k: 1000
    },
    "anthropic/claude-sonnet-4.5": {
      tier: "moderate",
      label: "Claude Sonnet 4.5",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.003,
      output_cost_per_1k_tokens_usd: 0.015,
      context_window_k: 1000
    },
    "anthropic/claude-sonnet-4.6": {
      tier: "moderate",
      label: "Claude Sonnet 4.6",
      provider: "anthropic",
      input_cost_per_1k_tokens_usd: 0.003,
      output_cost_per_1k_tokens_usd: 0.015,
      context_window_k: 1000
    },
    "deepseek/deepseek-r1-0528": {
      tier: "deep",
      label: "R1 0528",
      provider: "deepseek",
      input_cost_per_1k_tokens_usd: 0.0005,
      output_cost_per_1k_tokens_usd: 0.00215,
      context_window_k: 163.8
    },
    "deepseek/deepseek-v3.2": {
      tier: "moderate",
      label: "DeepSeek V3.2",
      provider: "deepseek",
      input_cost_per_1k_tokens_usd: 0.00026,
      output_cost_per_1k_tokens_usd: 0.00038,
      context_window_k: 163.8
    },
    "google/gemini-2.0-flash-001": {
      tier: "routine",
      label: "Gemini 2.0 Flash",
      provider: "google",
      input_cost_per_1k_tokens_usd: 0.0001,
      output_cost_per_1k_tokens_usd: 0.0004,
      context_window_k: 1048.6
    },
    "google/gemini-2.5-flash": {
      tier: "routine",
      label: "Gemini 2.5 Flash",
      provider: "google",
      input_cost_per_1k_tokens_usd: 0.0003,
      output_cost_per_1k_tokens_usd: 0.0025,
      context_window_k: 1048.6
    },
    "google/gemini-2.5-pro": {
      tier: "moderate",
      label: "Gemini 2.5 Pro",
      provider: "google",
      input_cost_per_1k_tokens_usd: 0.00125,
      output_cost_per_1k_tokens_usd: 0.01,
      context_window_k: 1048.6
    },
    "google/gemini-3.1-pro-preview": {
      tier: "deep",
      label: "Gemini 3.1 Pro Preview",
      provider: "google",
      input_cost_per_1k_tokens_usd: 0.002,
      output_cost_per_1k_tokens_usd: 0.012,
      context_window_k: 1048.6
    },
    "mistralai/codestral-2508": {
      tier: "routine",
      label: "Codestral 2508",
      provider: "mistralai",
      input_cost_per_1k_tokens_usd: 0.0003,
      output_cost_per_1k_tokens_usd: 0.0009,
      context_window_k: 256
    },
    "mistralai/devstral-medium": {
      tier: "moderate",
      label: "Devstral Medium",
      provider: "mistralai",
      input_cost_per_1k_tokens_usd: 0.0004,
      output_cost_per_1k_tokens_usd: 0.002,
      context_window_k: 131.1
    },
    "mistralai/mistral-large-2512": {
      tier: "deep",
      label: "Mistral Large 3 2512",
      provider: "mistralai",
      input_cost_per_1k_tokens_usd: 0.0005,
      output_cost_per_1k_tokens_usd: 0.0015,
      context_window_k: 262.1
    },
    "openai/gpt-4.1": {
      tier: "moderate",
      label: "GPT-4.1",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.002,
      output_cost_per_1k_tokens_usd: 0.008,
      context_window_k: 1047.6
    },
    "openai/gpt-4.1-mini": {
      tier: "routine",
      label: "GPT-4.1 Mini",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.0004,
      output_cost_per_1k_tokens_usd: 0.0016,
      context_window_k: 1047.6
    },
    "openai/gpt-4o": {
      tier: "moderate",
      label: "GPT-4o",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.0025,
      output_cost_per_1k_tokens_usd: 0.01,
      context_window_k: 128
    },
    "openai/gpt-4o-mini": {
      tier: "routine",
      label: "GPT-4o mini",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.00015,
      output_cost_per_1k_tokens_usd: 0.0006,
      context_window_k: 128
    },
    "openai/gpt-5": {
      tier: "deep",
      label: "GPT-5",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.00125,
      output_cost_per_1k_tokens_usd: 0.01,
      context_window_k: 400
    },
    "openai/gpt-5-mini": {
      tier: "moderate",
      label: "GPT-5 Mini",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.00025,
      output_cost_per_1k_tokens_usd: 0.002,
      context_window_k: 400
    },
    "openai/gpt-5.4": {
      tier: "deep",
      label: "GPT-5.4",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.0025,
      output_cost_per_1k_tokens_usd: 0.015,
      context_window_k: 1050
    },
    "openai/gpt-5.4-mini": {
      tier: "moderate",
      label: "GPT-5.4 Mini",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.00075,
      output_cost_per_1k_tokens_usd: 0.0045,
      context_window_k: 400
    },
    "openai/o1": {
      tier: "deep",
      label: "o1",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.015,
      output_cost_per_1k_tokens_usd: 0.06,
      context_window_k: 200
    },
    "openai/o3": {
      tier: "deep",
      label: "o3",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.002,
      output_cost_per_1k_tokens_usd: 0.008,
      context_window_k: 200
    },
    "openai/o3-mini": {
      tier: "moderate",
      label: "o3 Mini",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.0011,
      output_cost_per_1k_tokens_usd: 0.0044,
      context_window_k: 200
    },
    "openai/o3-pro": {
      tier: "deep",
      label: "o3 Pro",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.02,
      output_cost_per_1k_tokens_usd: 0.08,
      context_window_k: 200
    },
    "openai/o4-mini": {
      tier: "moderate",
      label: "o4 Mini",
      provider: "openai",
      input_cost_per_1k_tokens_usd: 0.0011,
      output_cost_per_1k_tokens_usd: 0.0044,
      context_window_k: 200
    },
    "qwen/qwen3-coder": {
      tier: "deep",
      label: "Qwen3 Coder 480B A35B",
      provider: "qwen",
      input_cost_per_1k_tokens_usd: 0.00022,
      output_cost_per_1k_tokens_usd: 0.001,
      context_window_k: 262.1
    },
    "qwen/qwen3-coder-30b-a3b-instruct": {
      tier: "moderate",
      label: "Qwen3 Coder 30B A3B Instruct",
      provider: "qwen",
      input_cost_per_1k_tokens_usd: 0.00007,
      output_cost_per_1k_tokens_usd: 0.00027,
      context_window_k: 160
    },
    "qwen/qwen3-coder-flash": {
      tier: "routine",
      label: "Qwen3 Coder Flash",
      provider: "qwen",
      input_cost_per_1k_tokens_usd: 0.000195,
      output_cost_per_1k_tokens_usd: 0.000975,
      context_window_k: 1000
    }
  }
};

function normalizeTier(value) {
  return value === "routine" || value === "moderate" || value === "deep" ? value : "unknown";
}

function normalizePrice(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Number((numeric * 1000).toFixed(6));
}

function normalizeContextWindow(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Number((numeric / 1000).toFixed(numeric % 1000 === 0 ? 0 : 1));
}

function titleCaseToken(token) {
  if (/^[a-z]+$/.test(token) && token.length <= 3) {
    return token.toUpperCase();
  }

  return token.charAt(0).toUpperCase() + token.slice(1);
}

function buildFallbackLabel(slug) {
  const [, modelSlug = slug] = String(slug).split("/");
  return modelSlug
    .split(/[-_]/g)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(" ");
}

async function loadTierMapping() {
  const raw = await readFile(tierMappingPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object" || typeof parsed.mappings !== "object") {
    throw new Error("Generated tier mapping is invalid.");
  }

  return parsed.mappings;
}

async function fetchOpenRouterModels() {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: {
      "User-Agent": "rightmodel.dev/2.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
  }

  const payload = await response.json();

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  throw new Error("OpenRouter models response did not include a model list.");
}

function normalizeModels(entries, tierMapping) {
  const models = {};
  const missingMappings = [];

  for (const entry of entries) {
    const slug = typeof entry?.id === "string" ? entry.id.trim() : "";

    if (!slug || !slug.includes("/")) {
      continue;
    }

    const provider = slug.split("/")[0];
    const inputCost = normalizePrice(entry?.pricing?.prompt);
    const outputCost = normalizePrice(entry?.pricing?.completion);
    const contextWindow = normalizeContextWindow(entry?.context_length);

    if (inputCost === null || outputCost === null || contextWindow === null) {
      continue;
    }

    const tier = normalizeTier(tierMapping[slug]);

    if (tier === "unknown") {
      missingMappings.push(slug);
    }

    models[slug] = {
      tier,
      label: typeof entry?.name === "string" && entry.name.trim() ? entry.name.trim() : buildFallbackLabel(slug),
      provider,
      input_cost_per_1k_tokens_usd: inputCost,
      output_cost_per_1k_tokens_usd: outputCost,
      context_window_k: contextWindow
    };
  }

  if (missingMappings.length > 0) {
    const preview = missingMappings.slice(0, 25).join(", ");
    const suffix = missingMappings.length > 25 ? ` (+${missingMappings.length - 25} more)` : "";
    console.warn(`OpenRouter models missing tier mapping: ${preview}${suffix}`);
  }

  return Object.fromEntries(Object.entries(models).sort(([left], [right]) => left.localeCompare(right)));
}

async function readLatestSnapshot(bucket) {
  const [files] = await bucket.getFiles({ prefix: "pricing/" });
  const snapshots = files.filter((file) => /pricing\/models-\d{4}-\d{2}-\d{2}\.json$/.test(file.name));

  if (snapshots.length === 0) {
    return null;
  }

  snapshots.sort((left, right) => right.name.localeCompare(left.name));
  const [raw] = await snapshots[0].download();
  return JSON.parse(raw.toString("utf8"));
}

export async function refreshPricingSnapshot() {
  const bucketName = process.env.RIGHTMODEL_CACHE_BUCKET;

  if (!bucketName) {
    throw new Error("RIGHTMODEL_CACHE_BUCKET is required");
  }

  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const previousSnapshot = await readLatestSnapshot(bucket).catch(() => null);

  try {
    const tierMapping = await loadTierMapping();
    const openRouterModels = await fetchOpenRouterModels();
    const normalizedModels = normalizeModels(openRouterModels, tierMapping);

    if (Object.keys(normalizedModels).length === 0) {
      throw new Error("OpenRouter returned no models that could be normalized.");
    }

    const snapshot = {
      source: "openrouter",
      retrieved_at: new Date().toISOString(),
      models: normalizedModels
    };

    const date = snapshot.retrieved_at.slice(0, 10);
    const file = bucket.file(`pricing/models-${date}.json`);
    await file.save(JSON.stringify(snapshot, null, 2), {
      contentType: "application/json"
    });

    return snapshot;
  } catch (error) {
    console.error("refreshPricing failed; retaining the previous snapshot.", error);

    if (previousSnapshot) {
      return previousSnapshot;
    }

    return DEFAULT_SNAPSHOT;
  }
}
