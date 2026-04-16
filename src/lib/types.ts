export type Tier = "routine" | "moderate" | "deep";
export type Provider = "all" | "anthropic" | "google" | "openai";
export type ProviderName = Exclude<Provider, "all">;

export interface RuleSignals {
  match_verbs: string[];
  match_patterns: string[];
  force_patterns: string[];
  exclude_patterns: string[];
  min_tokens?: number;
  max_tokens?: number;
}

export interface TierRule {
  tier: Tier;
  label: string;
  description: string;
  signals: RuleSignals;
  notes: string[];
}

export interface TaskSeo {
  h1: string;
  meta_description: string;
  title_tag: string;
}

export interface TaskArchetype {
  slug: string;
  title: string;
  description: string;
  tier: Tier;
  related_slugs: string[];
  seo: TaskSeo;
}

export interface ModelInfo {
  tier: Tier;
  label: string;
  input_cost_per_1k_tokens_usd: number;
  output_cost_per_1k_tokens_usd: number;
  context_window_k: number;
}

export type PricingModels = Record<ProviderName, Record<string, ModelInfo>>;

export interface PricingCache {
  retrieved_at: string;
  models: PricingModels;
}

export interface ExplanationEntry {
  key: string;
  explanation: string;
  overkill_note: string;
  context_note: string;
  blindspot_variants: string[];
}

export interface ExplanationCache {
  generated_at: string;
  tiers: Record<Provider, Partial<Record<Tier, ExplanationEntry>>>;
}

export interface ClassifierResult {
  tier: Tier;
  confidence: number;
  matchedSignals: string[];
  explanationKey: string;
}

export interface RecommendationResult extends ClassifierResult {
  provider: Provider;
  modelSlug: string;
  model: ModelInfo;
  modelProvider: ProviderName;
  defaultReachSlug: string | null;
  defaultReachModel: ModelInfo | null;
  defaultReachProvider: ProviderName | null;
  costMultiplier: number | null;
  costDeltaPer1kTokensUsd: number | null;
  costEstimatePerCallUsd: number | null;
  costComparisonDirection: "cheaper" | "more-expensive" | null;
  explanation: ExplanationEntry;
  shortInputNotice: string | null;
  providerConstraintNote: string | null;
  pricingRetrievedAt: string;
}
