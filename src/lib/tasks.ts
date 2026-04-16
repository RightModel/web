import type { TaskArchetype, Tier } from "@/lib/types";

export const commonTaskSlugs = [
  "write-unit-tests-express-api",
  "generate-typescript-types-from-json",
  "summarize-pull-request",
  "summarize-meeting-notes",
  "refactor-react-component-hooks",
  "implement-rest-api-endpoint",
  "write-github-actions-workflow",
  "debug-ci-pipeline-failure",
  "debug-async-race-condition",
  "design-database-schema-saas",
  "review-pull-request-security",
  "audit-authentication-flow"
];

export const representativeTaskSlugsByTier: Record<Tier, string[]> = {
  routine: [
    "write-unit-tests-express-api",
    "generate-typescript-types-from-json",
    "summarize-pull-request"
  ],
  moderate: [
    "refactor-react-component-hooks",
    "implement-rest-api-endpoint",
    "write-github-actions-workflow"
  ],
  deep: [
    "debug-async-race-condition",
    "design-database-schema-saas",
    "review-pull-request-security"
  ]
};

export function getTaskClassifierInput(task: TaskArchetype) {
  return `${task.title}. ${task.description}`;
}
