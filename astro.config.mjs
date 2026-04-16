import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

const site = process.env.PUBLIC_SITE_URL || "https://rightmodel.dev";

export default defineConfig({
  site,
  output: "static",
  integrations: [
    tailwind({
      applyBaseStyles: false
    }),
    sitemap()
  ],
  vite: {
    ssr: {
      noExternal: ["yaml"]
    }
  }
});
