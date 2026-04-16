import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Storage } from "@google-cloud/storage";

const cwd = process.cwd();
const dataDir = resolve(cwd, "src/data");
const generatedPricingPath = resolve(dataDir, "generated-pricing.json");
const generatedExplanationsPath = resolve(dataDir, "generated-explanations.json");
const defaultPricingPath = resolve(dataDir, "default-pricing.json");
const defaultExplanationsPath = resolve(dataDir, "default-explanations.json");

async function copyDefaults() {
  await mkdir(dataDir, { recursive: true });
  await cp(defaultPricingPath, generatedPricingPath);
  await cp(defaultExplanationsPath, generatedExplanationsPath);
}

async function pickLatestFile(bucket, prefix, matcher) {
  const [files] = await bucket.getFiles({ prefix });
  const candidates = files.filter((file) => matcher(file.name));

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => right.name.localeCompare(left.name));
  return candidates[0];
}

try {
  const bucketName = process.env.RIGHTMODEL_CACHE_BUCKET;

  if (!bucketName) {
    await copyDefaults();
    console.log("RIGHTMODEL_CACHE_BUCKET not set; using checked-in cache defaults.");
    process.exit(0);
  }

  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const pricingFile = await pickLatestFile(bucket, "pricing/", (name) => /models-\d{4}-\d{2}-\d{2}\.json$/.test(name));
  const explanationsFile =
    (await pickLatestFile(bucket, "explanations/", (name) => /site-build.*\.json$/.test(name))) ||
    (await pickLatestFile(bucket, "explanations/", (name) => /aggregate.*\.json$/.test(name)));

  if (!pricingFile || !explanationsFile) {
    await copyDefaults();
    console.log("Remote caches were not found; using checked-in cache defaults.");
    process.exit(0);
  }

  const [pricingText] = await pricingFile.download();
  const [explanationsText] = await explanationsFile.download();
  await writeFile(generatedPricingPath, pricingText);
  await writeFile(generatedExplanationsPath, explanationsText);
  console.log(`Fetched caches from gs://${bucketName}.`);
} catch (error) {
  await copyDefaults();
  console.warn("Falling back to checked-in caches.");
  console.warn(error instanceof Error ? error.message : String(error));
}
