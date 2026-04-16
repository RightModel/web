import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import YAML from "yaml";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["tier", "label", "description", "signals", "notes"],
  properties: {
    tier: {
      enum: ["routine", "moderate", "deep"]
    },
    label: {
      type: "string",
      minLength: 1
    },
    description: {
      type: "string",
      minLength: 1
    },
    signals: {
      type: "object",
      additionalProperties: false,
      properties: {
        match_verbs: {
          type: "array",
          items: { type: "string" }
        },
        match_patterns: {
          type: "array",
          items: { type: "string" }
        },
        force_patterns: {
          type: "array",
          items: { type: "string" }
        },
        exclude_patterns: {
          type: "array",
          items: { type: "string" }
        },
        min_tokens: {
          type: "integer",
          minimum: 0
        },
        max_tokens: {
          type: "integer",
          minimum: 0
        }
      }
    },
    notes: {
      type: "array",
      minItems: 1,
      items: { type: "string" }
    }
  }
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const rulesDir = resolve(process.cwd(), "src/content/rules");
const files = (await readdir(rulesDir)).filter((file) => file.endsWith(".yaml"));
let hasError = false;

for (const fileName of files) {
  const raw = await readFile(resolve(rulesDir, fileName), "utf8");
  const parsed = YAML.parse(raw);
  const valid = validate(parsed);

  if (!valid) {
    hasError = true;
    console.error(`Invalid rules file: ${fileName}`);

    for (const error of validate.errors || []) {
      console.error(`  ${error.instancePath || "/"} ${error.message}`);
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`Validated ${files.length} rules file(s).`);
