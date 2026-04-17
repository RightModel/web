import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import YAML from "yaml";

const rootDir = process.cwd();
const sourcePath = resolve(rootDir, "src/data/tier-mapping.yaml");
const outputPath = resolve(rootDir, "functions/lib/tier-mapping.generated.json");

const raw = await readFile(sourcePath, "utf8");
const parsed = YAML.parse(raw);

if (!parsed || typeof parsed !== "object" || typeof parsed.mappings !== "object" || Array.isArray(parsed.mappings)) {
  throw new Error("tier-mapping.yaml must define a top-level mappings object.");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ mappings: parsed.mappings }, null, 2)}\n`);
console.log(`Synced tier mapping to ${outputPath}.`);
