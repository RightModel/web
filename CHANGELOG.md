# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Split project specification documentation into `SPEC.md` (v1 base) and `SPEC_V2.md` (v2 features) to explicitly separate functionality milestones and pave the way for v3.

## [2.1.0] - 2026-05-16

### Added
- **Portable Artifact Endpoints**: Introduced static JSON endpoints (`/data/ruleset.json`, `/data/tier-mapping.json`, `/data/pricing.json`) allowing external AI agents and agent frameworks (like LangGraph, AutoGen) to securely fetch and evaluate ruleset intelligence without API dependencies.
- **Data Provenance Manifest**: Added `/data/manifest.json` providing content hashes (`sha256`) and the current git commit for verifiable artifact routing and audit trails.
- **Community Infrastructure**: Published `ROADMAP.md` mapping out future milestones (e.g. MCP Server) and `ALL_CONTRIBUTORS.md` to recognize non-code contributions.
- Documented "Consuming the published ruleset" examples in `/methodology` using Python and Node.js.

### Changed
- Expanded `README.md` to establish the Precomputed AI (PAI) Compiled Routing architectural identity as the foremost project focus.
- Upgraded the Node.js runtime environment to v22 across CI/CD workflows and local project config.
- Migrated content collections to the new Astro content layer, updated `astro:schema` import paths, and removed redundant meta description fields.

## [2.0.0] - 2026-05-09

*This major release introduces the Precomputed AI architecture, deep analysis escalation, and comprehensive SEO structures.*

### Added
- **Deep Analysis Workflow**: Exposed explicit `deep-analysis` function endpoint overriding heuristic defaults with live LLM (Gemini 2.5 Flash) evaluations upon user request. Added related JSON parsing, UI state helpers, and visual feedback badges.
- **Precomputed AI Architecture**: Formalized the project as a worked example of the Precomputed AI design pattern. Refined documentation across `/about` and `/methodology`.
- **Advanced SEO & Graph Capabilities**: Implemented dynamic sitemap generation, structured JSON-LD data for task/collection pages, and updated open graph (OG) image text generation with new value propositions.
- **Analytics & Tracking**: Added Google Analytics instrumentation via `set:html` for recommendation events and tracked token usage for AI calls.
- **Expanded Heuristics**: Adjusted classifier thresholds, improved confidence logic for task tiering accuracy, and expanded signal patterns across all task tiers.

### Changed
- Updated Astro dependencies and implemented strict security headers in `firebase.json`.
- Removed manual `meta_description` fields from task content files in favor of dynamic generation.
- Improved UI components, layout styling consistency, and accessibility standards. Added tailwind components and utility directives to global styles.

## [1.1.0] - 2026-04-16

### Added
- **Dynamic Pricing Updates**: Implemented cloud function (`refresh-pricing`) to fetch nightly pricing from OpenRouter models.
- **Automated Tier Mapping**: Synchronizes provider capabilities with standard task classification tiers.
- CLI usage additions and task template refactoring.

### Changed
- Migrated sensitive credentials from environment variables to Google Cloud Secret Manager for function configuration.
- Standardized environment variable management for deployment and removed explicit `GOOGLE_CLOUD_PROJECT` env var for dynamic resolution.
- Specified `index.mjs` as the main entry point in `package.json`.

## [1.0.0] - 2026-04-16

### Added
- Initial project commit.
- Launched base model-selection tool with heuristic classification.
- Established Astro, Tailwind CSS, and Firebase hosting infrastructure.
