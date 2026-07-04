import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writingCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
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
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/sketches' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['sketch', 'snippet']),
    attribution: z.string().optional(),
    attributionUrl: z.string().url().optional(),
    draft: z.boolean().optional().default(false),
    refs: z.array(z.string()).optional().default([]),
  }),
});

const notesCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = {
  writing: writingCollection,
  sketches: sketchesCollection,
  notes: notesCollection,
};
