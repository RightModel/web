import { getExplanationEntry } from "@/lib/data";
import type {
  ClassifierResult,
  ExplanationCache,
  ModelInfo,
  PricingCache,
  Provider,
  RecommendationResult,
  TaskArchetype,
  Tier,
  TierRule
} from "@/lib/types";

const TIER_ORDER: Tier[] = ["routine", "moderate", "deep"];
const MAINSTREAM_PROVIDERS = new Set(["anthropic", "google", "openai"]);
const CURATED_DEFAULT_SLUGS_BY_TIER: Record<Tier, string[]> = {
  routine: [
    "google/gemini-2.0-flash-001",
    "openai/gpt-4o-mini",
    "openai/gpt-4.1-mini",
    "anthropic/claude-3.5-haiku",
    "anthropic/claude-haiku-4.5"
  ],
  moderate: [
    "openai/gpt-5-mini",
    "openai/gpt-4.1",
    "openai/gpt-4o",
    "google/gemini-2.5-pro",
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-sonnet-4"
  ],
  deep: [
    "openai/o3",
    "openai/gpt-5",
    "openai/gpt-5.4",
    "google/gemini-3.1-pro-preview",
    "anthropic/claude-opus-4.7",
    "anthropic/claude-opus-4.6",
    "anthropic/claude-opus-4.5"
  ]
};

const AVERAGE_CALL_TOKENS: Record<Tier, { input: number; output: number }> = {
  routine: { input: 500, output: 250 },
  moderate: { input: 1000, output: 500 },
  deep: { input: 1800, output: 900 }
};

interface CandidateModel {
  slug: string;
  model: ModelInfo & { tier: Tier };
}

interface ScoreDetail {
  score: number;
  signals: string[];
}

function isKnownTier(value: string): value is Tier {
  return value === "routine" || value === "moderate" || value === "deep";
}

export function normaliseInput(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    normalized,
    tokens: normalized ? normalized.split(" ") : []
  };
}

function includesPattern(normalized: string, pattern: string) {
  return normalized.includes(pattern.toLowerCase());
}

function scoreRule(normalized: string, tokenCount: number, rule: TierRule): ScoreDetail {
  const signals: string[] = [];
  let score = 0;

  for (const pattern of rule.signals.match_patterns || []) {
    if (includesPattern(normalized, pattern)) {
      score += 0.24;
      signals.push(pattern);
    }
  }

  for (const verb of rule.signals.match_verbs || []) {
    if (includesPattern(normalized, verb)) {
      score += 0.14;
      signals.push(verb);
    }
  }

  for (const pattern of rule.signals.exclude_patterns || []) {
    if (includesPattern(normalized, pattern)) {
      score -= 0.18;
    }
  }

  if (typeof rule.signals.min_tokens === "number" && tokenCount >= rule.signals.min_tokens) {
    score += 0.04;
  }

  if (typeof rule.signals.max_tokens === "number" && tokenCount <= rule.signals.max_tokens) {
    score += 0.05;
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    signals: Array.from(new Set(signals))
  };
}

export function classifyTask(input: string, rules: TierRule[]): ClassifierResult {
  const { normalized, tokens } = normaliseInput(input);
  const tokenCount = tokens.length;
  const deepRule = rules.find((rule) => rule.tier === "deep");
  const routineRule = rules.find((rule) => rule.tier === "routine");
  const moderateRule = rules.find((rule) => rule.tier === "moderate");

  if (!normalized || !deepRule || !routineRule || !moderateRule) {
    return {
      tier: "moderate",
      confidence: 0.45,
      matchedSignals: [],
      explanationKey: "moderate-default"
    };
  }

  for (const pattern of deepRule.signals.force_patterns || []) {
    if (includesPattern(normalized, pattern)) {
      return {
        tier: "deep",
        confidence: 0.96,
        matchedSignals: [pattern],
        explanationKey: "deep-force"
      };
    }
  }

  const deepScore = scoreRule(normalized, tokenCount, deepRule);
  const routineScore = scoreRule(normalized, tokenCount, routineRule);
  const moderateScore = scoreRule(normalized, tokenCount, moderateRule);
  const moderateBase = normalized.length > 0 ? 0.5 : 0.3;
  const moderateConfidence = Math.max(moderateBase, moderateScore.score + 0.45);

  if (deepScore.score >= 0.62) {
    return {
      tier: "deep",
      confidence: Math.min(0.98, Math.max(0.68, deepScore.score)),
      matchedSignals: deepScore.signals,
      explanationKey: "deep-default"
    };
  }

  if (routineScore.score >= 0.5 && deepScore.score < 0.35) {
    return {
      tier: "routine",
      confidence: Math.min(0.95, Math.max(0.65, routineScore.score + 0.18)),
      matchedSignals: routineScore.signals,
      explanationKey: "routine-default"
    };
  }

  const moderateSignals = moderateScore.signals.length ? moderateScore.signals : ["ambiguous scope"];

  return {
    tier: "moderate",
    confidence: Math.min(0.92, moderateConfidence),
    matchedSignals: moderateSignals,
    explanationKey: "moderate-default"
  };
}

function getAverageCallCost(model: ModelInfo, tier: Tier) {
  const size = AVERAGE_CALL_TOKENS[tier];
  return (
    (size.input / 1000) * model.input_cost_per_1k_tokens_usd +
    (size.output / 1000) * model.output_cost_per_1k_tokens_usd
  );
}

function getCandidates(pricing: PricingCache, provider: Provider, tier?: Tier): CandidateModel[] {
  const candidates = Object.entries(pricing.models)
    .filter(([, model]) => isKnownTier(model.tier))
    .filter(([, model]) => !tier || model.tier === tier)
    .map(([slug, model]) => ({
      slug,
      model: model as ModelInfo & { tier: Tier }
    }));

  if (provider !== "all") {
    return candidates.filter((candidate) => candidate.model.provider === provider);
  }

  if (!tier) {
    return candidates.filter((candidate) => MAINSTREAM_PROVIDERS.has(candidate.model.provider));
  }

  const curatedSlugs = new Set(CURATED_DEFAULT_SLUGS_BY_TIER[tier]);
  const curatedCandidates = candidates.filter((candidate) => curatedSlugs.has(candidate.slug));

  if (curatedCandidates.length > 0) {
    return curatedCandidates;
  }

  return candidates.filter((candidate) => MAINSTREAM_PROVIDERS.has(candidate.model.provider));
}

function sortCandidates(candidates: CandidateModel[], taskTier: Tier) {
  return [...candidates].sort((left, right) => {
    const leftCost = getAverageCallCost(left.model, taskTier);
    const rightCost = getAverageCallCost(right.model, taskTier);

    if (leftCost !== rightCost) {
      return leftCost - rightCost;
    }

    return left.slug.localeCompare(right.slug);
  });
}

function pickCandidateForTier(
  pricing: PricingCache,
  provider: Provider,
  tier: Tier
): { candidate: CandidateModel; providerConstraintNote: string | null } {
  const exactMatches = sortCandidates(getCandidates(pricing, provider, tier), tier);

  if (exactMatches.length > 0) {
    return {
      candidate: exactMatches[0],
      providerConstraintNote: null
    };
  }

  const requestedIndex = TIER_ORDER.indexOf(tier);
  const available = getCandidates(pricing, provider);

  const closest = [...available].sort((left, right) => {
    const leftDistance = Math.abs(TIER_ORDER.indexOf(left.model.tier) - requestedIndex);
    const rightDistance = Math.abs(TIER_ORDER.indexOf(right.model.tier) - requestedIndex);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return getAverageCallCost(left.model, tier) - getAverageCallCost(right.model, tier);
  })[0];

  if (!closest) {
    throw new Error(`No covered models are available for provider filter "${provider}".`);
  }

  return {
    candidate: closest,
    providerConstraintNote:
      provider === "all"
        ? null
        : `Your current provider does not have a covered ${tier} tier, so this is the closest fit inside ${provider}.`
  };
}

function pickComparisonTier(tier: Tier): Tier | null {
  if (tier === "routine") {
    return "moderate";
  }

  if (tier === "moderate") {
    return "deep";
  }

  return "moderate";
}

function pickComparisonCandidate(pricing: PricingCache, provider: Provider, tier: Tier): CandidateModel | null {
  const filteredCandidates = sortCandidates(getCandidates(pricing, provider, tier), tier);

  if (filteredCandidates.length > 0) {
    return filteredCandidates[0];
  }

  if (provider !== "all") {
    const crossProviderCandidates = sortCandidates(getCandidates(pricing, "all", tier), tier);
    return crossProviderCandidates[0] || null;
  }

  return null;
}

function finalizeRecommendation(params: {
  input: string;
  provider: Provider;
  tier: Tier;
  classification: ClassifierResult;
  pricing: PricingCache;
  explanations: ExplanationCache;
}) {
  const { input, provider, tier, classification, pricing, explanations } = params;
  const selected = pickCandidateForTier(pricing, provider, tier);
  const comparisonTier = pickComparisonTier(tier);
  const comparison = comparisonTier ? pickComparisonCandidate(pricing, provider, comparisonTier) : null;
  const recommendedCost = getAverageCallCost(selected.candidate.model, tier);
  const comparisonCost = comparison ? getAverageCallCost(comparison.model, comparison.model.tier) : null;
  const costMultiplier =
    comparisonCost && recommendedCost > 0
      ? Math.max(recommendedCost, comparisonCost) / Math.min(recommendedCost, comparisonCost)
      : null;
  const costComparisonDirection =
    comparisonCost && recommendedCost !== comparisonCost
      ? recommendedCost < comparisonCost
        ? "cheaper"
        : "more-expensive"
      : null;
  const { tokens } = normaliseInput(input);
  const explanation = getExplanationEntry(explanations, provider, tier);
  const shortInputNotice =
    tokens.length > 0 && tokens.length < 20
      ? "Got a large codebase attached? That context may shift this. Paste a fuller description for a better result."
      : null;

  return {
    ...classification,
    tier,
    provider,
    modelSlug: selected.candidate.slug,
    model: selected.candidate.model,
    modelProvider: selected.candidate.model.provider,
    defaultReachSlug: comparison?.slug || null,
    defaultReachModel: comparison?.model || null,
    defaultReachProvider: comparison?.model.provider || null,
    costMultiplier,
    costDeltaPer1kTokensUsd: comparisonCost === null ? null : comparisonCost - recommendedCost,
    costEstimatePerCallUsd: recommendedCost,
    costComparisonDirection,
    explanation,
    shortInputNotice,
    providerConstraintNote: selected.providerConstraintNote,
    pricingRetrievedAt: pricing.retrieved_at
  } satisfies RecommendationResult;
}

export function buildRecommendation(params: {
  input: string;
  provider: Provider;
  rules: TierRule[];
  pricing: PricingCache;
  explanations: ExplanationCache;
}): RecommendationResult | null {
  const { input, provider, rules, pricing, explanations } = params;

  if (!input.trim()) {
    return null;
  }

  const classification = classifyTask(input, rules);
  return finalizeRecommendation({
    input,
    provider,
    tier: classification.tier,
    classification,
    pricing,
    explanations
  });
}

export function buildRecommendationForTask(params: {
  task: TaskArchetype;
  provider?: Provider;
  rules: TierRule[];
  pricing: PricingCache;
  explanations: ExplanationCache;
}) {
  const { task, provider = "all", rules, pricing, explanations } = params;
  const input = `${task.title}. ${task.description}`;
  const classification = classifyTask(input, rules);

  return finalizeRecommendation({
    input,
    provider,
    tier: task.tier,
    classification: {
      ...classification,
      tier: task.tier,
      confidence: 1
    },
    pricing,
    explanations
  });
}

export function estimateCostPer1kCalls(model: ModelInfo, tier: Tier) {
  const resolvedTier = isKnownTier(model.tier) ? model.tier : tier;
  return getAverageCallCost(model, resolvedTier) * 1000;
}
