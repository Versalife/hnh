import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('writing', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return rss({
    title: 'Hubris+Humility',
    description: 'Notes on algorithms, biology, and the craft of computation.',
    site: context.site ?? 'https://versalife.github.io',
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description ?? '',
      link: `${base}writing/${post.slug}/`,
    })),
  });
}
