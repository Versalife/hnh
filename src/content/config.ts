import { defineCollection, z } from 'astro:content';

const writingCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    draft: z.boolean().optional().default(false),
    citationKey: z.string().optional(),
    citationUrl: z.string().url().optional(),
  }),
});

const sketchesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['sketch', 'snippet']),
    attribution: z.string().optional(),
    attributionUrl: z.string().url().optional(),
    draft: z.boolean().optional().default(false),
    refs: z.array(z.string()).optional().default([]), // slugs of related entries, renders as "cf."
  }),
});

export const collections = {
  writing: writingCollection,
  sketches: sketchesCollection,
};
