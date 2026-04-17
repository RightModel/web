import { statSync } from "node:fs";
import { join } from "node:path";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { defaultSiteUrl } from "@/lib/site";

function sourceLastModified(sourcePath: string) {
  try {
    return statSync(join(process.cwd(), sourcePath)).mtime.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function urlEntry(siteUrl: string, pathname: string, lastmod?: string | null) {
  const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `<url><loc>${new URL(pathname, siteUrl).toString()}</loc>${lastmodTag}</url>`;
}

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.toString() ?? defaultSiteUrl;
  const tasks = (await getCollection("tasks")).map((entry) => entry.data);
  const staticRoutes = [
    { path: "/", source: "src/pages/index.astro" },
    { path: "/for", source: "src/pages/for/index.astro" },
    { path: "/about", source: "src/pages/about.astro" },
    { path: "/methodology", source: "src/pages/methodology.astro" },
    { path: "/models", source: "src/pages/models.astro" },
    { path: "/contribute", source: "src/pages/contribute.astro" },
    { path: "/changelog", source: "src/pages/changelog.astro" },
    { path: "/terms", source: "src/pages/terms.astro" },
    { path: "/privacy", source: "src/pages/privacy.astro" }
  ];

  const taskRoutes = tasks.map((task) => ({
    path: `/for/${task.slug}`,
    lastmod: sourceLastModified(`src/content/tasks/${task.slug}.yaml`)
  }));

  const body = [
    ...staticRoutes.map((route) => urlEntry(siteUrl, route.path, sourceLastModified(route.source))),
    ...taskRoutes.map((route) => urlEntry(siteUrl, route.path, route.lastmod))
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
