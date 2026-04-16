import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions";
import { refreshPricingSnapshot } from "./lib/refresh-pricing.mjs";
import { regenerateExplanationCache } from "./lib/regenerate-explanations.mjs";
import { triggerRepositoryDispatch } from "./lib/rebuild.mjs";
import { runDeepAnalysis } from "./lib/run-deep-analysis.mjs";

initializeApp();

export const refreshPricing = onSchedule("0 2 * * *", async () => {
  await refreshPricingSnapshot();
});

export const regenerateExplanations = onSchedule("0 3 * * *", async () => {
  await regenerateExplanationCache();
});

export const triggerRebuild = onSchedule("15 3 * * *", async () => {
  await triggerRepositoryDispatch();
});

export const deepAnalysis = onRequest({ cors: true }, async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = await runDeepAnalysis(request.body || {});
    response.status(200).json(payload);
  } catch (error) {
    logger.error("Deep analysis failed", error);
    response.status(500).json({ error: "Deep analysis failed" });
  }
});
