import { logger } from "firebase-functions/v2";
import { requireEnv } from "./config.mjs";
import { getRequiredSecret } from "./secrets.mjs";

export async function triggerRepositoryDispatch() {
  const owner = requireEnv("RIGHTMODEL_GITHUB_OWNER");
  const repo = requireEnv("RIGHTMODEL_GITHUB_REPO");
  const token = await getRequiredSecret("RIGHTMODEL_GITHUB_TOKEN");

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      event_type: "cache-updated"
    })
  });

  if (!response.ok) {
    throw new Error(`Dispatch failed with ${response.status}`);
  }

  logger.info(`Triggered GitHub rebuild for ${owner}/${repo}.`);
}
