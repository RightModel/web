import { buildRecommendation, estimateCostPer1kCalls } from "@/lib/classifier";
import { formatDate, formatMultiplier, formatUsd, formatUsdPerCall, sentenceCase } from "@/lib/format";
import type { ExplanationCache, PricingCache, Provider, RecommendationResult, TierRule } from "@/lib/types";

interface HomePageOptions {
  rules: TierRule[];
  pricing: PricingCache;
  explanations: ExplanationCache;
  placeholders: string[];
  deepAnalysisEndpoint?: string;
}

type DeepStatus = "idle" | "confirm" | "loading" | "error";

export function setupHomePage({
  rules,
  pricing,
  explanations,
  placeholders,
  deepAnalysisEndpoint
}: HomePageOptions) {
  const root = document.querySelector<HTMLElement>("[data-home-app]");

  if (!root) {
    return;
  }

  const input = root.querySelector<HTMLTextAreaElement>("[data-task-input]")!;
  const providerButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-provider]"));
  const output = root.querySelector<HTMLElement>("[data-output]")!;
  const emptyState = root.querySelector<HTMLElement>("[data-empty-state]")!;
  const outputCard = root.querySelector<HTMLElement>("[data-output-card]")!;
  const modelName = root.querySelector<HTMLElement>("[data-model-name]")!;
  const modelSlug = root.querySelector<HTMLElement>("[data-model-slug]")!;
  const modelProvider = root.querySelector<HTMLElement>("[data-model-provider]")!;
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

  let placeholderIndex = 0;
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
        label: recommendation.model.label,
        slug: recommendation.modelSlug,
        provider: recommendation.modelProvider,
        model: recommendation.model
      }
    ];

    if (recommendation.defaultReachModel && recommendation.defaultReachSlug && recommendation.defaultReachProvider) {
      rows.push({
        label: recommendation.defaultReachModel.label,
        slug: recommendation.defaultReachSlug,
        provider: recommendation.defaultReachProvider,
        model: recommendation.defaultReachModel
      });
    }

    breakdown.innerHTML = rows
      .map((row) => {
        const estimated = estimateCostPer1kCalls(row.model, row.model.tier);

        return `
          <tr>
            <td>
              <div class="font-semibold">${row.label}</div>
              <div class="rm-code text-sm text-[color:var(--color-fg-muted)]">${row.slug}</div>
            </td>
            <td class="text-sm">${sentenceCase(row.provider)}</td>
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
      costDelta.textContent = "Pricing snapshot loaded.";
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

    if (!recommendation) {
      output.hidden = true;
      emptyState.hidden = false;
      deepPrompt.hidden = true;
      copyStatus.textContent = "";
      return;
    }

    emptyState.hidden = true;
    output.hidden = false;
    outputCard.dataset.tier = recommendation.tier;
    modelName.textContent = `Use ${recommendation.model.label}.`;
    modelSlug.textContent = recommendation.modelSlug;
    modelProvider.textContent = sentenceCase(recommendation.modelProvider);
    overkillNote.textContent =
      recommendation.defaultReachModel && recommendation.costComparisonDirection === "cheaper"
        ? `${recommendation.defaultReachModel.label} is overkill here.`
        : recommendation.explanation.overkill_note.replace(/^./, (char) => char.toUpperCase());
    whyText.textContent = state.deep && state.deepExplanation ? state.deepExplanation : recommendation.explanation.explanation;
    signalsList.innerHTML = recommendation.matchedSignals
      .map((signal) => `<li>${signal}</li>`)
      .join("");
    sourcesDate.textContent = formatDate(recommendation.pricingRetrievedAt);
    shortInputNote.hidden = !recommendation.shortInputNotice;
    shortInputNote.textContent = recommendation.shortInputNotice || "";
    providerConstraintNote.hidden = !recommendation.providerConstraintNote;
    providerConstraintNote.textContent = recommendation.providerConstraintNote || "";
    stalePricing.hidden = daysOld <= 7;
    stalePricing.textContent = `Pricing data may be outdated. Last refreshed: ${formatDate(recommendation.pricingRetrievedAt)}.`;
    renderCostDelta(recommendation);
    renderBreakdown(recommendation);
    deepPrompt.hidden = recommendation.confidence >= 0.6 || deepDismissed;
    deepMessage.textContent =
      deepStatus === "error"
        ? "Deep analysis unavailable. Showing heuristic result."
        : "This will use approximately 500 tokens (~$0.00005). Proceed?";
    deepProgress.hidden = deepStatus !== "loading";
    whyPanel.open = false;
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
      state.deep = true;
      state.deepExplanation = payload.explanation || "";
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

  function rotatePlaceholder() {
    if (document.activeElement === input || input.value) {
      return;
    }

    placeholderIndex = (placeholderIndex + 1) % placeholders.length;
    input.placeholder = placeholders[placeholderIndex];
  }

  hydrateFromUrl();
  input.placeholder = state.q || placeholders[0];
  renderRecommendation();
  window.setInterval(rotatePlaceholder, 4000);

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
