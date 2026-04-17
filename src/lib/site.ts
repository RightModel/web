import type { Provider, Tier } from "@/lib/types";

export const siteTitle = "rightmodel";
export const siteDescription =
  "Paste what you are about to build. Get the right model in two seconds. No account, no guessing.";
export const defaultSiteUrl = "https://rightmodel.dev";

export const navLinks = [
  { href: "/for", label: "Tasks" },
  { href: "/models", label: "Models" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" }
];

export const footerLinks = {
  primary: [
    { href: "/for", label: "Task pages" },
    { href: "/methodology", label: "Methodology" },
    { href: "/changelog", label: "Changelog" },
    { href: "/models", label: "Models" }
  ],
  legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" }
  ]
};

export const providerOptions: { value: Provider; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "openai", label: "OpenAI" }
];

export const tierOrder: Tier[] = ["routine", "moderate", "deep"];

export const tierStyles: Record<Tier, { fg: string; bg: string; accent: string }> = {
  routine: {
    fg: "var(--color-success)",
    bg: "#e8f5ee",
    accent: "#2b6040"
  },
  moderate: {
    fg: "var(--color-accent)",
    bg: "var(--color-accent-subtle)",
    accent: "var(--color-accent)"
  },
  deep: {
    fg: "var(--color-warning)",
    bg: "#fdf3e0",
    accent: "var(--color-warning)"
  }
};

export const changelogEntries = [
  {
    date: "2026-07-25",
    type: "Updated",
    entry: "Refreshed Anthropic pricing snapshot and tightened routing for security review tasks."
  },
  {
    date: "2026-07-18",
    type: "Added",
    entry: "Launched with Anthropic, Google and OpenAI model coverage."
  }
];

export const pageDescriptions: Record<string, string> = {
  "/": siteDescription,
  "/for": "Browse indexed task pages that recommend the right AI model for common coding, debugging, and architecture work.",
  "/about": "Why rightmodel exists, who built it and how to get in touch.",
  "/methodology": "How rightmodel classifies tasks, uses pricing data and where the recommendation can be wrong.",
  "/models": "Covered models, tier assignments and nightly pricing snapshots.",
  "/contribute": "How to improve the ruleset and suggest recommendation fixes.",
  "/changelog": "Visible product updates, pricing changes that matter and recommendation fixes.",
  "/terms": "Plain-language terms of use for rightmodel.dev.",
  "/privacy": "How rightmodel handles analytics, logs and task descriptions."
};
