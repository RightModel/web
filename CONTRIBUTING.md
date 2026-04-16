# Contributing

rightmodel is maintained in spare time. Contributions are welcome, but review may not be immediate.

## Ruleset changes

Rules live in `src/content/rules/*.yaml`. Every rules file must include:

- `tier`
- `label`
- `description`
- `signals`
- `notes`

The `signals` object can contain:

- `match_verbs`
- `match_patterns`
- `force_patterns`
- `exclude_patterns`
- `min_tokens`
- `max_tokens`

Validate the ruleset before opening a pull request:

```bash
npm run validate:rules
```

If a ruleset change affects a recommendation, update or add a classifier test in `src/lib/classifier.test.ts`.

## Task archetypes

Task pages live in `src/content/tasks/*.yaml`. Each task file must include:

- `slug`
- `title`
- `description`
- `tier`
- `related_slugs`
- `seo.h1`
- `seo.meta_description`
- `seo.title_tag`

Task files must keep `related_slugs` valid and use filenames that match the slug exactly.

Validate task content before opening a pull request:

```bash
npm run validate:tasks
```

If you change task content, make sure the page still matches a real developer query and the title tag, H1, and meta description stay concise.

## Pull requests

- Explain the user-visible behaviour change.
- Cite the source or rationale for new signal patterns.
- Explain the search intent for new task archetypes.
- Keep copy aligned with `docs/BRAND.md`.
- Expect manual review before merge.
