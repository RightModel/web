import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
    const rules = (await getCollection("rules")).map((entry) => entry.data);

    return new Response(JSON.stringify({ rules }, null, 2), {
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    });
};
