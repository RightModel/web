import { describe, expect, it } from "vitest";
import { hasDeepAnalysisResult, shouldShowDeepPrompt } from "@/lib/home-page";

describe("home page deep analysis UI helpers", () => {
  it("treats deep analysis as complete only when explanation text exists", () => {
    expect(hasDeepAnalysisResult({ deep: true, deepExplanation: "More context helps." })).toBe(true);
    expect(hasDeepAnalysisResult({ deep: true, deepExplanation: "   " })).toBe(false);
    expect(hasDeepAnalysisResult({ deep: false, deepExplanation: "More context helps." })).toBe(false);
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
