import type { MetadataRoute } from 'next';

// TODO: remplacer par le nom de domaine réel une fois la plateforme déployée.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/provider'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
