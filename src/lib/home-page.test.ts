import { describe, expect, it } from "vitest";
import { buildDeepAnalysisNote, buildDeepPromptMessage, hasDeepAnalysisResult, shouldShowDeepPrompt } from "@/lib/home-page";
import type { RecommendationResult } from "@/lib/types";

describe("home page deep analysis UI helpers", () => {
  it("opens the explanation panel only after deep analysis returns text", () => {
    expect(hasDeepAnalysisResult({ deep: true, deepExplanation: "More context helps." })).toBe(true);
    expect(hasDeepAnalysisResult({ deep: true, deepExplanation: "   " })).toBe(false);
    expect(hasDeepAnalysisResult({ deep: false, deepExplanation: "More context helps." })).toBe(false);
  });

  it("shows the deep-analysis CTA until it is completed or dismissed", () => {
    expect(
      shouldShowDeepPrompt({
        deepDismissed: false,
        deepAnalysisComplete: true
      })
    ).toBe(false);

    expect(
      shouldShowDeepPrompt({
        deepDismissed: false,
        deepAnalysisComplete: false
      })
    ).toBe(true);

    expect(
      shouldShowDeepPrompt({
        deepDismissed: true,
        deepAnalysisComplete: false
      })
    ).toBe(false);
  });

  it("adjusts the deep-analysis prompt copy based on confidence", () => {
    expect(buildDeepPromptMessage(0.4)).toBe(
      "Not sure? Run deep analysis. This will use approximately 500 tokens (~$0.00005). Proceed?"
    );
    expect(buildDeepPromptMessage(0.7)).toBe(
      "Want a second pass? Run deep analysis. This will use approximately 500 tokens (~$0.00005). Proceed?"
    );
  });

  it("describes whether deep analysis confirmed or changed the recommendation", () => {
    expect(
      buildDeepAnalysisNote(
        { modelSlug: "anthropic/claude-sonnet-4", model: { label: "Claude Sonnet 4" } } as RecommendationResult,
        { modelSlug: "anthropic/claude-sonnet-4", model: { label: "Claude Sonnet 4" } } as RecommendationResult
      )
    ).toBe("Deep analysis confirmed Claude Sonnet 4.");
    expect(
      buildDeepAnalysisNote(
        { modelSlug: "anthropic/claude-sonnet-4", model: { label: "Claude Sonnet 4" } } as RecommendationResult,
        { modelSlug: "anthropic/claude-opus-4", model: { label: "Claude Opus 4" } } as RecommendationResult
      )
    ).toBe("Deep analysis updated this from Claude Sonnet 4 to Claude Opus 4.");
  });
});
