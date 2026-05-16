import { readFile } from "fs/promises";
import { createHash } from "crypto";

function sha256(content) {
    return createHash("sha256").update(content).digest("hex");
}

async function verify() {
    const manifestRaw = await readFile("dist/data/manifest.json", "utf8");
    const manifest = JSON.parse(manifestRaw);

    const rulesetRaw = await readFile("dist/data/ruleset.json", "utf8");
    const rulesetHash = sha256(rulesetRaw);

    const tierMappingRaw = await readFile("dist/data/tier-mapping.json", "utf8");
    const tierMappingHash = sha256(tierMappingRaw);

    const pricingRaw = await readFile("dist/data/pricing.json", "utf8");
    const pricingHash = sha256(pricingRaw);

    let success = true;

    if (manifest.ruleset.sha256 !== rulesetHash) {
        console.error(`Ruleset hash mismatch! Expected ${manifest.ruleset.sha256}, got ${rulesetHash}`);
        success = false;
    } else {
        console.log(`✅ Ruleset hash matches: ${rulesetHash}`);
    }

    if (manifest.tier_mapping.sha256 !== tierMappingHash) {
        console.error(`Tier mapping hash mismatch! Expected ${manifest.tier_mapping.sha256}, got ${tierMappingHash}`);
        success = false;
    } else {
        console.log(`✅ Tier mapping hash matches: ${tierMappingHash}`);
    }

    if (manifest.pricing.sha256 !== pricingHash) {
        console.error(`Pricing hash mismatch! Expected ${manifest.pricing.sha256}, got ${pricingHash}`);
        success = false;
    } else {
        console.log(`✅ Pricing hash matches: ${pricingHash}`);
    }

    // Schema checks
    if (manifest.schema_version !== "1" || !manifest.version || !manifest.generated_at || !manifest.git_commit || !manifest.build_reproducible) {
        console.error(`Manifest schema invalid:`, manifest);
        success = false;
    } else {
        console.log(`✅ Manifest schema is valid.`);
    }

    if (!success) {
        process.exit(1);
    }
}

verify().catch((e) => {
    console.error(e);
    process.exit(1);
});
