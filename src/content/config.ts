import { defineCollection, z } from "astro:content";

const signalSchema = z.object({
  match_verbs: z.array(z.string()).default([]),
  match_patterns: z.array(z.string()).default([]),
  force_patterns: z.array(z.string()).default([]),
  exclude_patterns: z.array(z.string()).default([]),
  min_tokens: z.number().int().nonnegative().optional(),
  max_tokens: z.number().int().nonnegative().optional()
});

const rules = defineCollection({
  type: "data",
  schema: z.object({
    tier: z.enum(["routine", "moderate", "deep"]),
    label: z.string(),
    description: z.string(),
    signals: signalSchema,
    notes: z.array(z.string()).min(1)
  })
});

const tasks = defineCollection({
  type: "data",
  schema: z.object({
    slug: z
      .string()
      .max(60)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1).max(80),
    description: z.string().min(1).max(120),
    tier: z.enum(["routine", "moderate", "deep"]),
    related_slugs: z.array(z.string()).min(2).max(4),
    seo: z.object({
      h1: z.string().min(1).max(80),
      meta_description: z.string().min(1).max(155),
      title_tag: z.string().min(1).max(60)
    })
  })
});

export const collections = {
  rules,
  tasks
};
