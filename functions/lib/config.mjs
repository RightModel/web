export function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function requireProjectId() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

  if (!projectId) {
    throw new Error("Missing required Google Cloud project ID environment variable.");
  }

  return projectId;
}
