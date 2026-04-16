import defaultPricing from "@/data/default-pricing.json";
import generatedPricing from "@/data/generated-pricing.json";
import defaultExplanations from "@/data/default-explanations.json";
import generatedExplanations from "@/data/generated-explanations.json";
import type { ExplanationCache, ExplanationEntry, PricingCache, Provider, Tier } from "@/lib/types";

export function getPricingCache(): PricingCache {
  return (generatedPricing as PricingCache).retrieved_at
    ? (generatedPricing as PricingCache)
    : (defaultPricing as PricingCache);
}

export function getExplanationCache(): ExplanationCache {
  return (generatedExplanations as ExplanationCache).generated_at
    ? (generatedExplanations as ExplanationCache)
    : (defaultExplanations as ExplanationCache);
}

export function getExplanationEntry(
  explanations: ExplanationCache,
  provider: Provider,
  tier: Tier
): ExplanationEntry {
  return (
    explanations.tiers[provider]?.[tier] ||
    explanations.tiers.all?.[tier] || {
      key: `${tier}-fallback`,
      explanation:
        "This recommendation is based on the current ruleset and pricing snapshot. If your task spans a larger codebase, add that context for a stronger read.",
      overkill_note: "A larger model is not justified unless the task clearly needs more reasoning depth.",
      context_note: "Add codebase size or system scope if that context matters.",
      blindspot_variants: [
        "A larger codebase or longer prompt can shift this recommendation. Mention it if it matters."
      ]
    }
  );
}
