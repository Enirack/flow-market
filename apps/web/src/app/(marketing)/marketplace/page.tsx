import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, EmptyState } from '@flowmarket/ui';
import { getCategories, searchServices } from '@/lib/api';
import { AiSearchBar } from '@/components/ai-search-bar';
import { ServiceCard } from '@/components/service-card';

export const metadata: Metadata = { title: 'Explorer les services' };

interface MarketplacePageProps {
  searchParams: Promise<{ category?: string; q?: string; maxPrice?: string; sort?: string; page?: string }>;
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const { category, q, maxPrice, sort, page } = await searchParams;
  const pageNumber = Number(page ?? '1') || 1;
  const maxPriceNumber = maxPrice ? Number(maxPrice) : undefined;

  const [categories, results] = await Promise.all([
    getCategories(),
    searchServices({
      ...(category ? { category } : {}),
      ...(q ? { q } : {}),
      ...(maxPriceNumber ? { maxPrice: maxPriceNumber } : {}),
      ...(sort ? { sort } : {}),
      page: pageNumber,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Explorer les services</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {results.total} service{results.total > 1 ? 's' : ''} disponible
          {results.total > 1 ? 's' : ''}
        </p>
      </div>

      <AiSearchBar defaultQuery={q} category={category} />

      <div className="mb-8 flex flex-wrap gap-2">
        <Button variant={!category ? 'default' : 'outline'} size="sm" asChild>
          <Link href="/marketplace">Toutes les catégories</Link>
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.slug}
            variant={category === cat.slug ? 'default' : 'outline'}
            size="sm"
            asChild
          >
            <Link href={`/marketplace?category=${cat.slug}`}>{cat.name}</Link>
          </Button>
        ))}
      </div>

      {results.hits.length === 0 ? (
        <EmptyState
          title="Aucun service trouvé"
          description="Essayez une autre recherche ou catégorie."
          action={
            <Button variant="outline" asChild>
              <Link href="/marketplace">Réinitialiser les filtres</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.hits.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}

      {results.totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: results.totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === pageNumber ? 'default' : 'outline'} size="sm" asChild>
              <Link
                href={`/marketplace?${new URLSearchParams({ ...(category ? { category } : {}), ...(q ? { q } : {}), ...(maxPrice ? { maxPrice } : {}), page: String(p) }).toString()}`}
              >
                {p}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
