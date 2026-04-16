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
    expect(result?.modelSlug).toBe("gemini-flash-2-0");
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
    expect(result.modelSlug).toBe("claude-opus-4");
  });
});
