import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/how-it-works`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/categories`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const [categories, pros] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.proProfile.findMany({ where: { verified: true }, select: { id: true, updatedAt: true } }),
  ]);

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/categories/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const proPages: MetadataRoute.Sitemap = pros.map((p) => ({
    url: `${base}/pros/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticPages, ...categoryPages, ...proPages];
}
