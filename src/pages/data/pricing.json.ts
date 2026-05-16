import { getPricingCache } from "@/lib/data";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
    const pricing = getPricingCache();

    return new Response(JSON.stringify(pricing, null, 2), {
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    });
};
