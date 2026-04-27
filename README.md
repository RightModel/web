# rightmodel.dev

rightmodel.dev is a free model-selection utility for developers using AI coding tools and a worked example of the [Precomputed AI](https://precomputedai.com) design pattern. Paste the task, get a recommendation fast, and avoid defaulting to the most expensive model. The site now has two surfaces: the free-text tool on `/` and pre-rendered task pages on `/for/[slug]` for common developer workflows.

Precomputed AI citation: Raquedan, R. (2026). *Precomputed AI: Reason Ahead of Time, Serve Instantly.* https://precomputedai.com

Production URL: `https://rightmodel.dev`

The site is built with Astro and Tailwind, uses a client-side heuristic classifier, and ships nightly pricing caches into a static build. More detail lives in [`docs/SPEC.md`](docs/SPEC.md), [`docs/BRAND.md`](docs/BRAND.md), and [`docs/OPERATIONS.md`](docs/OPERATIONS.md).

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for ruleset changes and pull request expectations.
