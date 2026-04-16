import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv from "ajv";
import YAML from "yaml";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["slug", "title", "description", "tier", "related_slugs", "seo"],
  properties: {
    slug: {
      type: "string",
      maxLength: 60,
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    title: {
      type: "string",
      minLength: 1,
      maxLength: 80
    },
    description: {
      type: "string",
      minLength: 1,
      maxLength: 120
    },
    tier: {
      enum: ["routine", "moderate", "deep"]
    },
    related_slugs: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "string",
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$"
      }
    },
    seo: {
      type: "object",
      additionalProperties: false,
      required: ["h1", "meta_description", "title_tag"],
      properties: {
        h1: {
          type: "string",
          minLength: 1,
          maxLength: 80
        },
        meta_description: {
          type: "string",
          minLength: 1,
          maxLength: 155
        },
        title_tag: {
          type: "string",
          minLength: 1,
          maxLength: 60,
          pattern: "\u2014 rightmodel$"
        }
      }
    }
  }
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const tasksDir = resolve(process.cwd(), "src/content/tasks");
const files = (await readdir(tasksDir)).filter((file) => file.endsWith(".yaml"));
const seenSlugs = new Set();
const tasks = [];
let hasError = false;

if (files.length < 50) {
  hasError = true;
  console.error(`Expected at least 50 task files, found ${files.length}.`);
}

for (const fileName of files) {
  const raw = await readFile(resolve(tasksDir, fileName), "utf8");
  const parsed = YAML.parse(raw);
  const valid = validate(parsed);

  if (!valid) {
    hasError = true;
    console.error(`Invalid task file: ${fileName}`);

    for (const error of validate.errors || []) {
      console.error(`  ${error.instancePath || "/"} ${error.message}`);
    }

    continue;
  }

  if (parsed.slug !== fileName.replace(/\.yaml$/, "")) {
    hasError = true;
    console.error(`Task file mismatch: ${fileName} must match slug ${parsed.slug}.yaml`);
  }

  if (seenSlugs.has(parsed.slug)) {
    hasError = true;
    console.error(`Duplicate task slug: ${parsed.slug}`);
  }

  seenSlugs.add(parsed.slug);
  tasks.push(parsed);
}

for (const task of tasks) {
  if (!/^Which AI model|^What AI model|^Best AI model/.test(task.seo.h1)) {
    hasError = true;
    console.error(`Invalid H1 prefix for task ${task.slug}`);
  }

  if (!task.seo.meta_description.includes("Use ")) {
    hasError = true;
    console.error(`Meta description for ${task.slug} should name the recommendation.`);
  }

  for (const relatedSlug of task.related_slugs) {
    if (!seenSlugs.has(relatedSlug)) {
      hasError = true;
      console.error(`Broken related slug in ${task.slug}: ${relatedSlug}`);
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`Validated ${files.length} task file(s).`);
