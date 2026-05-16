import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import YAML from "yaml";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
    const sourcePath = resolve(process.cwd(), "src/data/tier-mapping.yaml");
    const raw = await readFile(sourcePath, "utf8");
    const parsed = YAML.parse(raw);

    return new Response(JSON.stringify(parsed, null, 2), {
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    });
};
