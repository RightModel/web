import { buildRecommendation, estimateCostPer1kCalls } from "@/lib/classifier";
import { formatDate, formatMultiplier, formatUsd, formatUsdPerCall, sentenceCase } from "@/lib/format";
import type { ExplanationCache, PricingCache, Provider, RecommendationResult, TierRule } from "@/lib/types";

interface HomePageOptions {
  rules: TierRule[];
  pricing: PricingCache;
  explanations: ExplanationCache;
  deepAnalysisEndpoint?: string;
}

type DeepStatus = "idle" | "loading" | "error";

interface DeepAnalysisResultState {
  deep: boolean;
  deepExplanation: string;
}

interface DeepPromptState {
  confidence: number;
  deepDismissed: boolean;
  deepAnalysisComplete: boolean;
}

export function hasDeepAnalysisResult(state: DeepAnalysisResultState) {
  return state.deep && state.deepExplanation.trim().length > 0;
}

export function shouldShowDeepPrompt({
  confidence,
  deepDismissed,
  deepAnalysisComplete
}: DeepPromptState) {
  return confidence < 0.6 && !deepDismissed && !deepAnalysisComplete;
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

  const state = {
    q: "",
    provider: "all" as Provider,
    deep: false,
    recommendation: null as RecommendationResult | null,
    deepExplanation: ""
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
    state.recommendation = buildRecommendation({
      input: state.q,
      provider: state.provider,
      rules,
      pricing,
      explanations
    });

    const recommendation = state.recommendation;
    const pricingDate = new Date(pricing.retrieved_at);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - pricingDate.getTime()) / (1000 * 60 * 60 * 24));
    const deepAnalysisComplete = hasDeepAnalysisResult(state);

    if (!recommendation) {
      output.hidden = true;
      secondaryControls.hidden = true;
      deepPrompt.hidden = true;
      copyStatus.textContent = "";
      return;
    }

    output.hidden = false;
    secondaryControls.hidden = false;
    outputCard.dataset.tier = recommendation.tier;
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
    deepPrompt.hidden = !shouldShowDeepPrompt({
      confidence: recommendation.confidence,
      deepDismissed,
      deepAnalysisComplete
    });
    deepMessage.textContent =
      deepStatus === "error"
        ? "Deep analysis unavailable. Showing heuristic result."
        : "Not sure? Run deep analysis. This uses about 500 tokens (~$0.00005) before it fires.";
    deepProgress.hidden = deepStatus !== "loading";
    whyPanel.open = deepAnalysisComplete;
  }

  async function runDeepAnalysis() {
    if (!state.recommendation) {
      return;
    }

    deepStatus = "loading";
    deepPrompt.hidden = false;
    deepProgress.hidden = false;
    deepMessage.textContent = "Running deep analysis...";

    if (!deepAnalysisEndpoint) {
      deepStatus = "error";
      deepProgress.hidden = true;
      state.deep = false;
      state.deepExplanation = "";
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
          tier: state.recommendation.tier,
          matchedSignals: state.recommendation.matchedSignals,
          model: state.recommendation.model.label
        })
      });

      if (!response.ok) {
        throw new Error("Deep analysis failed");
      }

      const payload = (await response.json()) as { explanation?: string };
      const explanation = typeof payload.explanation === "string" ? payload.explanation.trim() : "";

      if (!explanation) {
        throw new Error("Deep analysis returned an invalid response");
      }

      state.deep = true;
      state.deepExplanation = explanation;
      deepStatus = "idle";
      deepDismissed = false;
      deepProgress.hidden = true;
      pushUrl();
      renderRecommendation();
    } catch {
      deepStatus = "error";
      state.deep = false;
      state.deepExplanation = "";
      deepProgress.hidden = true;
      pushUrl();
      renderRecommendation();
    }
  }

  function scheduleRender() {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => {
      state.q = input.value.slice(0, 500);
      state.deep = false;
      state.deepExplanation = "";
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
      state.provider = (button.dataset.provider || "all") as Provider;
      state.deep = false;
      state.deepExplanation = "";
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
    deepStatus = "idle";
    state.deep = false;
    state.deepExplanation = "";
    deepDismissed = true;
    pushUrl();
    renderRecommendation();
  });
}
