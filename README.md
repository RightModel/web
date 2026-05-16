# rightmodel.dev

rightmodel implements the Compiled Routing pattern from the [Precomputed AI](https://precomputedai.com) (PAI) architecture. Reasoning is compiled into a versioned ruleset and served instantly at request time, with live inference reserved for an opt-in escalation path.

rightmodel.dev is a free utility for developers using AI coding tools. Paste the task you are about to build, get an instant model-tier recommendation, and avoid defaulting to the most expensive model out of habit. The site offers a free-text tool on `/` and pre-rendered task pages on `/for/[slug]` covering common developer workflows.

## Quick Start

1. **Web:** Visit [rightmodel.dev](https://rightmodel.dev).
2. **Type/Paste:** Enter what you're building (e.g., "Refactor authentication middleware to use JWTs").
3. **Get Answer:** Instantly see the cheapest model tier that safely handles the reasoning load.

For downstream agentic workflows, the ruleset and tier-mapping are available as portable artifacts:
- `https://rightmodel.dev/data/ruleset.json`
- `https://rightmodel.dev/data/tier-mapping.json`

## Contributing & Community

rightmodel is an open-source project and we'd love your help to keep the ruleset sharp and add new tasks! 

- **Join the community:** Connect with us on [Discord](https://discord.gg/precomputedai) to discuss ideas, ask questions, or just hang out.
- **Good first issues:** Check our [issue tracker](https://github.com/RightModel/web/issues) for issues tagged `good first issue` (like adding a task page or tweaking a regex).
- **Roadmap & Contributors:** See [`ROADMAP.md`](ROADMAP.md) for where we're headed and [`ALL_CONTRIBUTORS.md`](ALL_CONTRIBUTORS.md) for those who've helped us get here.
- **How to contribute:** See [`CONTRIBUTING.md`](CONTRIBUTING.md) for ruleset changes and PR expectations.

---
**Precomputed AI citation:** Raquedan, R. (2026). *Precomputed AI: Reason Ahead of Time, Serve Instantly.* https://precomputedai.com
