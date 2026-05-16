import { createHash } from "node:crypto";
import { getCollection } from "astro:content";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import { getPricingCache } from "@/lib/data";
import type { APIRoute } from "astro";

function sha256(content: string) {
    return createHash("sha256").update(content).digest("hex");
}

export const GET: APIRoute = async ({ site }) => {
    const rules = (await getCollection("rules")).map((entry) => entry.data);
    const rulesJson = JSON.stringify({ rules }, null, 2);

    const sourcePath = resolve(process.cwd(), "src/data/tier-mapping.yaml");
    const raw = await readFile(sourcePath, "utf8");
    const parsed = YAML.parse(raw);
    const tierMappingJson = JSON.stringify(parsed, null, 2);

    const pricing = getPricingCache();
    const pricingJson = JSON.stringify(pricing, null, 2);

    const baseUrl = site ? site.toString().replace(/\/$/, "") : "https://rightmodel.dev";
    const gitCommit = import.meta.env.GITHUB_SHA || "unknown";

    const manifest = {
        schema_version: "1",
        version: "2.0.0",
        generated_at: new Date().toISOString(),
        git_commit: gitCommit,
        build_reproducible: true,
        ruleset: {
            url: `${baseUrl}/data/ruleset.json`,
            sha256: sha256(rulesJson)
        },
        tier_mapping: {
            url: `${baseUrl}/data/tier-mapping.json`,
            sha256: sha256(tierMappingJson)
        },
        pricing: {
            url: `${baseUrl}/data/pricing.json`,
            sha256: sha256(pricingJson),
            retrieved_at: pricing.retrieved_at,
            source: pricing.source
        },
        license: "MIT",
        source_repo: "https://github.com/RightModel/web"
    };

    return new Response(JSON.stringify(manifest, null, 2), {
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    });
};
