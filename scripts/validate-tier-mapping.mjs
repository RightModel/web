import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv from "ajv";
import YAML from "yaml";

const tierMappingPath = resolve(process.cwd(), "src/data/tier-mapping.yaml");
const generatedPricingPath = resolve(process.cwd(), "src/data/generated-pricing.json");
const defaultPricingPath = resolve(process.cwd(), "src/data/default-pricing.json");

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["mappings"],
  properties: {
    mappings: {
      type: "object",
      minProperties: 1,
      additionalProperties: {
        enum: ["routine", "moderate", "deep"]
      },
      propertyNames: {
        type: "string",
        pattern: "^[a-z0-9-]+\\/[a-z0-9.-]+$"
      }
    }
  }
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const raw = await readFile(tierMappingPath, "utf8");
const parsed = YAML.parse(raw);
const valid = validate(parsed);

if (!valid) {
  console.error("Invalid tier mapping file: src/data/tier-mapping.yaml");

  for (const error of validate.errors || []) {
    console.error(`  ${error.instancePath || "/"} ${error.message}`);
  }

  process.exit(1);
}

const pricingRaw = await readFile(generatedPricingPath, "utf8").catch(() => readFile(defaultPricingPath, "utf8"));
const pricing = JSON.parse(pricingRaw);
const availableSlugs = new Set(Object.keys(pricing.models || {}));

for (const slug of Object.keys(parsed.mappings)) {
  if (!availableSlugs.has(slug)) {
    console.warn(`Warning: ${slug} is mapped but not present in the latest pricing cache.`);
  }
}

console.log(`Validated ${Object.keys(parsed.mappings).length} tier mapping entr${Object.keys(parsed.mappings).length === 1 ? "y" : "ies"}.`);
