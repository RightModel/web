import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectId = process.env.RIGHTMODEL_GCP_PROJECT_ID;

if (!projectId) {
  console.error("Missing RIGHTMODEL_GCP_PROJECT_ID.");
  process.exit(1);
}

const requiredVars = [
  "RIGHTMODEL_CACHE_BUCKET",
  "RIGHTMODEL_GITHUB_OWNER",
  "RIGHTMODEL_GITHUB_REPO",
  "RIGHTMODEL_GITHUB_TOKEN",
  "GEMINI_API_KEY"
];

const missing = requiredVars.filter((key) => !process.env[key]);

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
  `RIGHTMODEL_GITHUB_OWNER=${quoteEnv(process.env.RIGHTMODEL_GITHUB_OWNER)}`,
  `RIGHTMODEL_GITHUB_REPO=${quoteEnv(process.env.RIGHTMODEL_GITHUB_REPO)}`,
  `RIGHTMODEL_GITHUB_TOKEN=${quoteEnv(process.env.RIGHTMODEL_GITHUB_TOKEN)}`,
  `RIGHTMODEL_VERTEX_MODEL=${quoteEnv(process.env.RIGHTMODEL_VERTEX_MODEL || "gemini-2.5-flash")}`,
  `GEMINI_API_KEY=${quoteEnv(process.env.GEMINI_API_KEY)}`
].join("\n");

await mkdir(resolve(process.cwd(), "functions"), { recursive: true });
await writeFile(outputPath, `${fileContents}\n`, "utf8");
console.log(`Wrote functions runtime env file: ${outputPath}`);
