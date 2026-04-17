import { describe, expect, it } from "vitest";
import { buildRecommendation, buildRecommendationForTask, classifyTask } from "@/lib/classifier";
import { getExplanationCache, getPricingCache } from "@/lib/data";
import { loadRulesFromFiles } from "@/lib/load-rules-from-files";

describe("classifier", async () => {
  const rules = await loadRulesFromFiles();
  const pricing = getPricingCache();
  const explanations = getExplanationCache();

  it("classifies summarization as routine", () => {
    const result = classifyTask("summarize these meeting notes", rules);
    expect(result.tier).toBe("routine");
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("classifies refactoring as moderate", () => {
    const result = classifyTask("refactor this React component to use hooks", rules);
    expect(result.tier).toBe("moderate");
  });

  it("classifies database schema work as deep", () => {
    const result = classifyTask("design a database schema for a multi-tenant SaaS", rules);
    expect(result.tier).toBe("deep");
    expect(result.matchedSignals).toContain("database schema");
  });

  it("keeps terse bounded conversions in the routine lane", () => {
    const result = classifyTask("convert curl to fetch", rules);
    expect(result.tier).toBe("routine");
  });

  it("keeps contained timeout debugging out of the routine lane", () => {
    const result = classifyTask(
      "diagnose a timeout in a known request path with logs and timings",
      rules
    );
    expect(result.tier).toBe("moderate");
  });

  it("promotes migration-strategy planning into deep", () => {
    const result = classifyTask("plan a data migration strategy", rules);
    expect(result.tier).toBe("deep");
    expect(result.matchedSignals).toContain("migration strategy");
  });

  it("recommends a cheap routine model for a routine task", () => {
    const result = buildRecommendation({
      input: "write unit tests for an Express API endpoint",
      provider: "all",
      rules,
      pricing,
      explanations
    });

    expect(result).not.toBeNull();
    expect(result?.tier).toBe("routine");
    expect(result?.modelSlug).toBe("google/gemini-2.0-flash-001");
    expect(result?.costComparisonDirection).toBe("cheaper");
  });

  it("keeps an ambiguous input eligible for deep mode", () => {
    const result = classifyTask("help me sort out this API issue", rules);
    expect(result.tier).toBe("moderate");
    expect(result.confidence).toBeLessThan(0.6);
  });

  it("builds a task-page recommendation from the reviewed task tier", () => {
    const result = buildRecommendationForTask({
      task: {
        slug: "review-pull-request-security",
        title: "Review a Pull Request for Security",
        description: "Review a code change for auth gaps, injection risks, data exposure, and unsafe assumptions.",
        tier: "deep",
        related_slugs: ["review-sql-injection-risk", "audit-authentication-flow"],
        seo: {
          h1: "Which AI model should you use to review a pull request for security?",
          meta_description:
            "Security review needs deeper reasoning. Use Claude Opus 4. Claude Sonnet 4 is cheaper, but this is worth paying up.",
          title_tag: "Best AI model for security PR review — rightmodel"
        }
      },
      rules,
      pricing,
      explanations
    });

    expect(result.tier).toBe("deep");
    expect(result.modelSlug).toBe("openai/o3");
  });

  it("uses the curated best-value lane for all-provider moderate picks", () => {
    const result = buildRecommendation({
      input: "refactor this React component to use hooks",
      provider: "all",
      rules,
      pricing,
      explanations
    });

    expect(result).not.toBeNull();
    expect(result?.tier).toBe("moderate");
    expect(result?.modelSlug).toBe("openai/gpt-5-mini");
  });

  it("uses the expanded OpenAI moderate pool when filtered", () => {
    const result = buildRecommendation({
      input: "refactor this React component to use hooks",
      provider: "openai",
      rules,
      pricing,
      explanations
    });

    expect(result).not.toBeNull();
    expect(result?.tier).toBe("moderate");
    expect(result?.modelSlug).toBe("openai/gpt-5-mini");
  });

  it("gives Google a deep-tier option after the mapping expansion", () => {
    const result = buildRecommendation({
      input: "design a database schema for a multi-tenant SaaS",
      provider: "google",
      rules,
      pricing,
      explanations
    });

    expect(result).not.toBeNull();
    expect(result?.tier).toBe("deep");
    expect(result?.modelSlug).toBe("google/gemini-3.1-pro-preview");
  });
});
