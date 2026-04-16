import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import type { TierRule } from "@/lib/types";

const RULE_FILES = ["routine.yaml", "moderate.yaml", "deep.yaml"];

export async function loadRulesFromFiles() {
  const cwd = process.cwd();
  const basePath = resolve(cwd, "src/content/rules");
  const rules = await Promise.all(
    RULE_FILES.map(async (fileName) => {
      const file = await readFile(resolve(basePath, fileName), "utf8");
      return YAML.parse(file) as TierRule;
    })
  );

  return rules;
}
