import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { tagSlug } from '../lib/slug.mjs';
import tagSlugs from '../data/tag-slugs.json';

/** Own /sitemap.xml instead of an integration-generated /sitemap-index.xml,
 *  so the published URL stays exactly what the old site served. */
export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://www.st-albireo.net')).href.replace(/\/$/, '');
  const pages = await getCollection('pages', (e) => !e.data.draft);
  const tags = [...new Set(pages.flatMap((p) => p.data.tags))];

  const urls = [
    ...pages.map((p) => (p.id === 'index' ? '/' : `/${p.id}/`)),
    '/tags/',
    ...tags.map((t) => `/tags/${tagSlug(t, tagSlugs)}/`),
  ]
    .filter((u, i, a) => a.indexOf(u) === i)
    .sort();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${encodeURI(u)}</loc></url>`).join('\n')}
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
