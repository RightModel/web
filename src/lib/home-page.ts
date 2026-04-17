import { buildRecommendation, buildRecommendationFromTier, estimateCostPer1kCalls } from "@/lib/classifier";
import { formatDate, formatMultiplier, formatUsd, formatUsdPerCall, sentenceCase } from "@/lib/format";
import type { ExplanationCache, PricingCache, Provider, RecommendationResult, Tier, TierRule } from "@/lib/types";

interface HomePageOptions {
  rules: TierRule[];
  pricing: PricingCache;
  explanations: ExplanationCache;
  deepAnalysisEndpoint?: string;
}

type DeepStatus = "idle" | "loading" | "error";

interface DeepAnalysisState {
  deep: boolean;
  deepExplanation: string;
  heuristicRecommendation: RecommendationResult | null;
  deepRecommendation: RecommendationResult | null;
}

type DeepAnalysisResultState = Pick<DeepAnalysisState, "deep" | "deepExplanation">;

interface DeepPromptState {
  deepDismissed: boolean;
  deepAnalysisComplete: boolean;
}

export function hasDeepAnalysisResult(state: DeepAnalysisResultState) {
  return state.deep && state.deepExplanation.trim().length > 0;
}

export function shouldShowDeepPrompt({
  deepDismissed,
  deepAnalysisComplete
}: DeepPromptState) {
  return !deepAnalysisComplete && !deepDismissed;
}

export function buildDeepPromptMessage(confidence: number) {
  const costDisclosure = "This will use approximately 500 tokens (~$0.00005). Proceed?";

  if (confidence < 0.6) {
    return `Not sure? Run deep analysis. ${costDisclosure}`;
  }

  return `Want a second pass? Run deep analysis. ${costDisclosure}`;
}

export function buildDeepAnalysisNote(
  previousRecommendation: RecommendationResult | null,
  currentRecommendation: RecommendationResult | null
) {
  if (!previousRecommendation || !currentRecommendation) {
    return "Deep analysis updated the recommendation.";
  }

  if (previousRecommendation.modelSlug === currentRecommendation.modelSlug) {
    return `Deep analysis confirmed ${currentRecommendation.model.label}.`;
  }

  return `Deep analysis updated this from ${previousRecommendation.model.label} to ${currentRecommendation.model.label}.`;
}

interface DeepAnalysisResponse {
  tier: Tier;
  explanation: string;
  signals?: string[];
  degraded?: boolean;
}

export function setupHomePage({ rules, pricing, explanations, deepAnalysisEndpoint }: HomePageOptions) {
  const root = document.querySelector<HTMLElement>("[data-home-app]");

  if (!root) {
    return;
  }

  const input = root.querySelector<HTMLTextAreaElement>("[data-task-input]")!;
  const providerButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-provider]"));
  const output = root.querySelector<HTMLElement>("[data-output]")!;
  const outputCard = root.querySelector<HTMLElement>("[data-output-card]")!;
  const analysisMeta = root.querySelector<HTMLElement>("[data-analysis-meta]")!;
  const analysisBadge = root.querySelector<HTMLElement>("[data-analysis-badge]")!;
  const analysisNote = root.querySelector<HTMLElement>("[data-analysis-note]")!;
  const secondaryControls = root.querySelector<HTMLElement>("[data-secondary-controls]")!;
  const modelName = root.querySelector<HTMLElement>("[data-model-name]")!;
  const overkillNote = root.querySelector<HTMLElement>("[data-overkill-note]")!;
  const costDelta = root.querySelector<HTMLElement>("[data-cost-delta]")!;
  const shortInputNote = root.querySelector<HTMLElement>("[data-short-input-note]")!;
  const providerConstraintNote = root.querySelector<HTMLElement>("[data-provider-constraint]")!;
  const stalePricing = root.querySelector<HTMLElement>("[data-stale-pricing]")!;
  const whyPanel = root.querySelector<HTMLDetailsElement>("[data-why-panel]")!;
  const whyText = root.querySelector<HTMLElement>("[data-why-text]")!;
  const signalsList = root.querySelector<HTMLElement>("[data-signals]")!;
  const sourcesDate = root.querySelector<HTMLElement>("[data-sources-date]")!;
  const breakdown = root.querySelector<HTMLTableSectionElement>("[data-breakdown]")!;
  const copyButton = root.querySelector<HTMLButtonElement>("[data-copy-link]")!;
  const copyStatus = root.querySelector<HTMLElement>("[data-copy-status]")!;
  const deepPrompt = root.querySelector<HTMLElement>("[data-deep-prompt]")!;
  const deepMessage = root.querySelector<HTMLElement>("[data-deep-message]")!;
  const deepRun = root.querySelector<HTMLButtonElement>("[data-deep-run]")!;
  const deepCancel = root.querySelector<HTMLButtonElement>("[data-deep-cancel]")!;
  const deepProgress = root.querySelector<HTMLElement>("[data-deep-progress]")!;

  let renderTimer: number | undefined;
  let deepStatus: DeepStatus = "idle";
  let deepDismissed = false;
  let deepAnalysisRequestId = 0;

  const state = {
    q: "",
    provider: "all" as Provider,
    deep: false,
    deepExplanation: "",
    heuristicRecommendation: null as RecommendationResult | null,
    deepRecommendation: null as RecommendationResult | null
  };

  function hydrateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    state.q = params.get("q") || "";
    const provider = params.get("provider");
    state.provider =
      provider === "anthropic" || provider === "google" || provider === "openai" ? provider : "all";
    state.deep = params.get("deep") === "true";
    input.value = state.q;
    updateProviderButtons();
  }

  function pushUrl() {
    const params = new URLSearchParams();

    if (state.q.trim()) {
      params.set("q", state.q.trim());
    }

    if (state.provider !== "all") {
      params.set("provider", state.provider);
    }

    if (state.deep) {
      params.set("deep", "true");
    }

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }

  function updateProviderButtons() {
    for (const button of providerButtons) {
      const active = button.dataset.provider === state.provider;
      button.dataset.active = active ? "true" : "false";
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function renderBreakdown(recommendation: RecommendationResult) {
    const rows = [
      {
        slug: recommendation.modelSlug,
        model: recommendation.model
      }
    ];

    if (recommendation.defaultReachModel && recommendation.defaultReachSlug) {
      rows.push({
        slug: recommendation.defaultReachSlug,
        model: recommendation.defaultReachModel
      });
    }

    breakdown.innerHTML = rows
      .map((row) => {
        const estimated = estimateCostPer1kCalls(row.model, recommendation.tier);

        return `
          <tr>
            <td>
              <div class="font-semibold">${row.model.label}</div>
              <div class="rm-code text-sm text-[color:var(--color-fg-muted)]">${row.slug}</div>
            </td>
            <td class="text-sm">${sentenceCase(row.model.provider)}</td>
            <td class="text-sm">${sentenceCase(row.model.tier)}</td>
            <td class="rm-code text-sm">${formatUsd(row.model.input_cost_per_1k_tokens_usd)}</td>
            <td class="rm-code text-sm">${formatUsd(row.model.output_cost_per_1k_tokens_usd)}</td>
            <td class="rm-code text-sm">${formatUsdPerCall(estimated)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderCostDelta(recommendation: RecommendationResult) {
    if (!recommendation.costMultiplier || !recommendation.costComparisonDirection) {
      costDelta.textContent = "Cost delta unavailable for this provider choice.";
      return;
    }

    const multiplier = formatMultiplier(recommendation.costMultiplier);
    const suffix = recommendation.costComparisonDirection === "cheaper" ? "cheaper per run." : "more per run.";
    costDelta.textContent = `${multiplier} ${suffix}`;
  }

  function renderRecommendation() {
    state.heuristicRecommendation = buildRecommendation({
      input: state.q,
      provider: state.provider,
      rules,
      pricing,
      explanations
    });

    const recommendation =
      state.deep && state.deepRecommendation ? state.deepRecommendation : state.heuristicRecommendation;
    const heuristicRecommendation = state.heuristicRecommendation;
    const pricingDate = new Date(pricing.retrieved_at);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - pricingDate.getTime()) / (1000 * 60 * 60 * 24));

    if (!recommendation) {
      output.hidden = true;
      secondaryControls.hidden = true;
      analysisMeta.hidden = true;
      analysisBadge.textContent = "";
      analysisNote.textContent = "";
      deepPrompt.hidden = true;
      copyStatus.textContent = "";
      return;
    }

    const deepAnalysisComplete = hasDeepAnalysisResult(state);
    const deepAnalysisNote = deepAnalysisComplete
      ? buildDeepAnalysisNote(heuristicRecommendation, recommendation)
      : "";

    output.hidden = false;
    secondaryControls.hidden = false;
    outputCard.dataset.tier = recommendation.tier;
    analysisMeta.hidden = !deepAnalysisComplete;
    analysisBadge.textContent = "Deep analysis";
    analysisNote.textContent = deepAnalysisNote;
    modelName.textContent = `Use ${recommendation.model.label} (${recommendation.modelSlug}).`;
    overkillNote.textContent =
      recommendation.defaultReachModel && recommendation.costComparisonDirection === "cheaper"
        ? `${recommendation.defaultReachModel.label} is overkill here.`
        : recommendation.explanation.overkill_note.replace(/^./, (char) => char.toUpperCase());
    whyText.textContent = deepAnalysisComplete ? state.deepExplanation : recommendation.explanation.explanation;
    signalsList.innerHTML = recommendation.matchedSignals.map((signal) => `<li>${signal}</li>`).join("");
    sourcesDate.textContent = formatDate(recommendation.pricingRetrievedAt);
    shortInputNote.hidden = !recommendation.shortInputNotice;
    shortInputNote.textContent = recommendation.shortInputNotice || "";
    providerConstraintNote.hidden = !recommendation.providerConstraintNote;
    providerConstraintNote.textContent = recommendation.providerConstraintNote || "";
    stalePricing.hidden = daysOld <= 7;
    stalePricing.textContent = `Pricing data may be outdated. Last refreshed: ${formatDate(recommendation.pricingRetrievedAt)}.`;
    renderCostDelta(recommendation);
    renderBreakdown(recommendation);
    deepPrompt.hidden = shouldShowDeepPrompt({
      deepDismissed,
      deepAnalysisComplete
    });
    deepMessage.textContent =
      deepStatus === "error"
        ? "Deep analysis unavailable. Showing heuristic result."
        : buildDeepPromptMessage(heuristicRecommendation?.confidence || 0);
    deepProgress.hidden = deepStatus !== "loading";

    if (deepAnalysisComplete) {
      whyPanel.open = true;
    }
  }

  async function runDeepAnalysis() {
    const heuristicRecommendation = state.heuristicRecommendation;

    if (!heuristicRecommendation) {
      return;
    }

    const requestId = ++deepAnalysisRequestId;
    const requestSnapshot = {
      q: state.q,
      provider: state.provider,
      tier: heuristicRecommendation.tier,
      modelSlug: heuristicRecommendation.modelSlug
    };

    deepStatus = "loading";
    deepPrompt.hidden = false;
    deepProgress.hidden = false;
    deepMessage.textContent = "Running deep analysis…";

    if (!deepAnalysisEndpoint) {
      deepStatus = "error";
      deepProgress.hidden = true;
      state.deep = false;
      state.deepExplanation = "";
      state.deepRecommendation = null;
      pushUrl();
      renderRecommendation();
      return;
    }

    try {
      const response = await fetch(deepAnalysisEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: state.q,
          provider: state.provider,
          tier: heuristicRecommendation.tier,
          matchedSignals: heuristicRecommendation.matchedSignals,
          model: heuristicRecommendation.model.label
        })
      });

      if (!response.ok) {
        throw new Error("Deep analysis failed");
      }

      const payload = (await response.json()) as DeepAnalysisResponse;

      if (payload.degraded) {
        throw new Error("Deep analysis degraded");
      }

      const explanation = payload.explanation?.trim();
      const tier = payload.tier;
      const signals = Array.isArray(payload.signals)
        ? payload.signals.map((signal) => String(signal || "").trim()).filter(Boolean).slice(0, 4)
        : [];

      if (!explanation || (tier !== "routine" && tier !== "moderate" && tier !== "deep")) {
        throw new Error("Deep analysis returned an invalid response");
      }

      const deepRecommendation = buildRecommendationFromTier({
        input: state.q,
        provider: state.provider,
        tier,
        rules,
        pricing,
        explanations,
        matchedSignals: signals.length > 0 ? signals : heuristicRecommendation.matchedSignals
      });

      if (!deepRecommendation) {
        throw new Error("Deep analysis recommendation could not be built");
      }

      if (
        requestId !== deepAnalysisRequestId ||
        state.q !== requestSnapshot.q ||
        state.provider !== requestSnapshot.provider ||
        state.heuristicRecommendation?.tier !== requestSnapshot.tier ||
        state.heuristicRecommendation?.modelSlug !== requestSnapshot.modelSlug
      ) {
        return;
      }

      state.deep = true;
      state.deepExplanation = explanation;
      state.deepRecommendation = deepRecommendation;
      deepStatus = "idle";
      deepDismissed = false;
      deepProgress.hidden = true;
      pushUrl();
      renderRecommendation();
    } catch {
      if (
        requestId !== deepAnalysisRequestId ||
        state.q !== requestSnapshot.q ||
        state.provider !== requestSnapshot.provider
      ) {
        return;
      }

      deepStatus = "error";
      state.deep = false;
      state.deepExplanation = "";
      state.deepRecommendation = null;
      deepProgress.hidden = true;
      pushUrl();
      renderRecommendation();
    }
  }

  function scheduleRender() {
    deepAnalysisRequestId += 1;
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => {
      state.q = input.value.slice(0, 500);
      state.deep = false;
      state.deepExplanation = "";
      state.deepRecommendation = null;
      deepStatus = "idle";
      deepDismissed = false;
      input.value = state.q;
      pushUrl();
      renderRecommendation();
    }, 300);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyStatus.textContent = "Link copied.";
    } catch {
      copyStatus.textContent = "Copy unavailable in this browser.";
    }

    window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 1800);
  }

  hydrateFromUrl();
  renderRecommendation();

  if (state.deep && state.q) {
    void runDeepAnalysis();
  }

  input.addEventListener("input", scheduleRender);

  for (const button of providerButtons) {
    button.addEventListener("click", () => {
      deepAnalysisRequestId += 1;
      state.provider = (button.dataset.provider || "all") as Provider;
      state.deep = false;
      state.deepExplanation = "";
      state.deepRecommendation = null;
      deepStatus = "idle";
      deepDismissed = false;
      updateProviderButtons();
      pushUrl();
      renderRecommendation();
    });
  }

  copyButton.addEventListener("click", () => {
    void copyLink();
  });

  deepRun.addEventListener("click", () => {
    void runDeepAnalysis();
  });

  deepCancel.addEventListener("click", () => {
    deepAnalysisRequestId += 1;
    deepStatus = "idle";
    state.deep = false;
    state.deepExplanation = "";
    state.deepRecommendation = null;
    deepDismissed = true;
    pushUrl();
    renderRecommendation();
  });
}
