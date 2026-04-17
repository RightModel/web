import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectId = process.env.RIGHTMODEL_GCP_PROJECT_ID;

if (!projectId) {
  console.error("Missing RIGHTMODEL_GCP_PROJECT_ID.");
  process.exit(1);
}

const requiredVars = [
  "RIGHTMODEL_CACHE_BUCKET"
];

const [derivedOwner = "", derivedRepo = ""] = (process.env.GITHUB_REPOSITORY || "").split("/", 2);
const githubOwner = process.env.RIGHTMODEL_GITHUB_OWNER || process.env.GITHUB_REPOSITORY_OWNER || derivedOwner;
const githubRepo = process.env.RIGHTMODEL_GITHUB_REPO || derivedRepo;
const missing = requiredVars.filter((key) => !process.env[key]);

if (!githubOwner) {
  missing.push("RIGHTMODEL_GITHUB_OWNER (or GITHUB_REPOSITORY_OWNER)");
}

if (!githubRepo) {
  missing.push("RIGHTMODEL_GITHUB_REPO (or GITHUB_REPOSITORY)");
}

if (missing.length > 0) {
  console.error(`Missing required functions env values: ${missing.join(", ")}`);
  process.exit(1);
}

function quoteEnv(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const outputPath = resolve(process.cwd(), "functions", `.env.${projectId}`);
const fileContents = [
  `RIGHTMODEL_CACHE_BUCKET=${quoteEnv(process.env.RIGHTMODEL_CACHE_BUCKET)}`,
  `GOOGLE_CLOUD_PROJECT=${quoteEnv(projectId)}`,
  `RIGHTMODEL_GITHUB_OWNER=${quoteEnv(githubOwner)}`,
  `RIGHTMODEL_GITHUB_REPO=${quoteEnv(githubRepo)}`,
  `RIGHTMODEL_VERTEX_MODEL=${quoteEnv(process.env.RIGHTMODEL_VERTEX_MODEL || "gemini-2.5-flash")}`
].join("\n");

await mkdir(resolve(process.cwd(), "functions"), { recursive: true });
await writeFile(outputPath, `${fileContents}\n`, "utf8");
console.log(`Wrote functions runtime env file: ${outputPath}`);
