import { describe, expect, it } from "vitest";
import { hasDeepAnalysisResult, shouldShowDeepPrompt } from "@/lib/home-page";

describe("home page deep analysis UI helpers", () => {
  it("treats deep analysis as complete only when a tier was returned", () => {
    expect(hasDeepAnalysisResult({ deep: true, deepTier: "deep" })).toBe(true);
    expect(hasDeepAnalysisResult({ deep: true, deepTier: null })).toBe(false);
    expect(hasDeepAnalysisResult({ deep: false, deepTier: "deep" })).toBe(false);
  });

  it("shows the deep-analysis CTA only for low-confidence heuristic results", () => {
    expect(
      shouldShowDeepPrompt({
        confidence: 0.45,
        deepDismissed: false,
        deepAnalysisComplete: false
      })
    ).toBe(true);

    expect(
      shouldShowDeepPrompt({
        confidence: 0.7,
        deepDismissed: false,
        deepAnalysisComplete: false
      })
    ).toBe(false);

    expect(
      shouldShowDeepPrompt({
        confidence: 0.45,
        deepDismissed: false,
        deepAnalysisComplete: true
      })
    ).toBe(false);
  });
});
