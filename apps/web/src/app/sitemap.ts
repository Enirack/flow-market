import type { MetadataRoute } from 'next';
import { searchServices } from '@/lib/api';

// TODO: remplacer par le nom de domaine réel une fois la plateforme déployée.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const STATIC_ROUTES = ['', '/marketplace', '/pricing', '/login', '/register'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: 'daily',
    priority: route === '' ? 1 : 0.7,
  }));

  try {
    const { hits } = await searchServices({ limit: 48 });
    const serviceEntries: MetadataRoute.Sitemap = hits.map((service) => ({
      url: `${SITE_URL}/services/${service.slug}`,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));
    return [...staticEntries, ...serviceEntries];
  } catch {
    return staticEntries;
  }
}
