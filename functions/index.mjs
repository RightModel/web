import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions";
import { refreshPricingSnapshot } from "./lib/refresh-pricing.mjs";
import { regenerateExplanationCache } from "./lib/regenerate-explanations.mjs";
import { triggerRepositoryDispatch } from "./lib/rebuild.mjs";
import { runDeepAnalysis } from "./lib/run-deep-analysis.mjs";

initializeApp();

const region = "us-central1";

export const refreshPricing = onSchedule({ schedule: "0 2 * * *", region }, async () => {
  await refreshPricingSnapshot();
});

export const regenerateExplanations = onSchedule({ schedule: "0 3 * * *", region }, async () => {
  await regenerateExplanationCache();
});

export const triggerRebuild = onSchedule({ schedule: "15 3 * * *", region }, async () => {
  await triggerRepositoryDispatch();
});

export const deepAnalysis = onRequest({ cors: true, region }, async (request, response) => {
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
