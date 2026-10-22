import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { idFromPath } from './lib/slug.mjs';

const pages = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/pages',
    // id === URL path. Zola slugified file names ('_' -> '-'), so the ids
    // come out identical to the legacy URLs: /docs/linux/wayland-gtk-fcitx5/
    generateId: ({ entry }) => idFromPath(entry),
  }),
  schema: z.object({
    date: z.coerce.date().optional(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    thumbnail: z.string().optional(),
    tags: z.array(z.string()).default([]),
    order: z.number().optional(), // サイドバーの並び（小さいほど上）
    draft: z.boolean().default(false),
  }),
});

export const collections = { pages };
