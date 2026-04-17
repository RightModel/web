import { Storage } from "@google-cloud/storage";

const OFFICIAL_PRICING_URLS = {
  anthropic: "https://docs.anthropic.com/en/docs/about-claude/pricing",
  googleDeveloper: "https://ai.google.dev/gemini-api/docs/pricing",
  googleVertex: "https://cloud.google.com/vertex-ai/generative-ai/pricing",
  openai: "https://openai.com/api/pricing"
};

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

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normaliseHtml(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPer1k(perMillionValue) {
  return Number((perMillionValue / 1000).toFixed(6));
}

async function fetchNormalisedPage(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "rightmodel-web/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  return normaliseHtml(html);
}

function extractAnthropicModel(text, modelName) {
  const index = text.indexOf(modelName);

  if (index === -1) {
    return null;
  }

  const section = text.slice(index, index + 400);
  const values = [...section.matchAll(/\$([\d.]+)\s*\/\s*MTok/gi)].map((match) => Number(match[1]));

  if (values.length < 2) {
    return null;
  }

  return {
    input_cost_per_1k_tokens_usd: toPer1k(values[0]),
    output_cost_per_1k_tokens_usd: toPer1k(values[values.length - 1])
  };
}

function extractOpenAIModel(text, modelName) {
  const rowPattern = new RegExp(`${escapeRegExp(modelName)}\\s*\\$([\\d.]+)\\s*\\$([\\d.]+)\\s*\\$([\\d.]+)`, "i");
  const match = text.match(rowPattern);

  if (!match) {
    return null;
  }

  return {
    input_cost_per_1k_tokens_usd: toPer1k(Number(match[1])),
    output_cost_per_1k_tokens_usd: toPer1k(Number(match[3]))
  };
}

function extractGoogle20Flash(text) {
  const match = text.match(
    /Gemini 2\.0 Flash[\s\S]{0,500}?1M Input tokens\s*\$([\d.]+)[\s\S]{0,200}?1M Output text tokens\s*\$([\d.]+)/i
  );

  if (!match) {
    return null;
  }

  return {
    input_cost_per_1k_tokens_usd: toPer1k(Number(match[1])),
    output_cost_per_1k_tokens_usd: toPer1k(Number(match[2]))
  };
}

function extractGoogle25Pro(text) {
  const match = text.match(
    /gemini-2\.5-pro[\s\S]{0,600}?Input price[\s\S]{0,250}?\$([\d.]+)[\s\S]{0,350}?Output price[\s\S]{0,250}?\$([\d.]+)/i
  );

  if (!match) {
    return null;
  }

  return {
    input_cost_per_1k_tokens_usd: toPer1k(Number(match[1])),
    output_cost_per_1k_tokens_usd: toPer1k(Number(match[2]))
  };
}

async function fetchAnthropicPricing() {
  const text = await fetchNormalisedPage(OFFICIAL_PRICING_URLS.anthropic);

  return {
    "claude-haiku-3-5": extractAnthropicModel(text, "Claude Haiku 3.5"),
    "claude-sonnet-4": extractAnthropicModel(text, "Claude Sonnet 4"),
    "claude-opus-4": extractAnthropicModel(text, "Claude Opus 4")
  };
}

async function fetchOpenAIPricing() {
  const text = await fetchNormalisedPage(OFFICIAL_PRICING_URLS.openai);

  return {
    "gpt-4o-mini": extractOpenAIModel(text, "gpt-4o-mini"),
    "gpt-4o": extractOpenAIModel(text, "gpt-4o")
  };
}

async function fetchGooglePricing() {
  const [developerText, vertexText] = await Promise.all([
    fetchNormalisedPage(OFFICIAL_PRICING_URLS.googleDeveloper),
    fetchNormalisedPage(OFFICIAL_PRICING_URLS.googleVertex)
  ]);

  return {
    "gemini-flash-2-0": extractGoogle20Flash(vertexText) || extractGoogle20Flash(developerText),
    "gemini-pro-2-5": extractGoogle25Pro(developerText) || extractGoogle25Pro(vertexText)
  };
}

function mergeProviderModels(defaultModels, fetchedModels) {
  return Object.fromEntries(
    Object.entries(defaultModels).map(([slug, model]) => [
      slug,
      fetchedModels[slug]
        ? {
            ...model,
            ...fetchedModels[slug]
          }
        : model
    ])
  );
}

export async function refreshPricingSnapshot() {
  const bucketName = process.env.RIGHTMODEL_CACHE_BUCKET;

  if (!bucketName) {
    throw new Error("RIGHTMODEL_CACHE_BUCKET is required");
  }

  const [anthropicResult, googleResult, openaiResult] = await Promise.allSettled([
    fetchAnthropicPricing(),
    fetchGooglePricing(),
    fetchOpenAIPricing()
  ]);

  const snapshot = {
    retrieved_at: new Date().toISOString(),
    source_urls: OFFICIAL_PRICING_URLS,
    models: {
      anthropic: mergeProviderModels(
        DEFAULT_SNAPSHOT.models.anthropic,
        anthropicResult.status === "fulfilled" ? anthropicResult.value : {}
      ),
      google: mergeProviderModels(
        DEFAULT_SNAPSHOT.models.google,
        googleResult.status === "fulfilled" ? googleResult.value : {}
      ),
      openai: mergeProviderModels(
        DEFAULT_SNAPSHOT.models.openai,
        openaiResult.status === "fulfilled" ? openaiResult.value : {}
      )
    }
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
