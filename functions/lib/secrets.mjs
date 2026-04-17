import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { requireEnv } from "./config.mjs";

const secretManager = new SecretManagerServiceClient();
const secretCache = new Map();

export async function getRequiredSecret(name) {
  const cached = secretCache.get(name);

  if (cached) {
    return cached;
  }

  const projectId = requireEnv("GOOGLE_CLOUD_PROJECT");
  const loadPromise = loadSecret(name, projectId);
  secretCache.set(name, loadPromise);

  try {
    return await loadPromise;
  } catch (error) {
    secretCache.delete(name);
    throw error;
  }
}

async function loadSecret(name, projectId) {
  const [version] = await secretManager.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/latest`
  });
  const value = version.payload?.data?.toString("utf8").trim();

  if (!value) {
    throw new Error(`Secret Manager returned an empty ${name} payload.`);
  }

  return value;
}
