import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button, EmptyState, Input } from '@flowmarket/ui';
import { getCategories, searchServices } from '@/lib/api';
import { ServiceCard } from '@/components/service-card';

export const metadata: Metadata = { title: 'Explorer les services' };

interface MarketplacePageProps {
  searchParams: Promise<{ category?: string; q?: string; sort?: string; page?: string }>;
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const { category, q, sort, page } = await searchParams;
  const pageNumber = Number(page ?? '1') || 1;

  const [categories, results] = await Promise.all([
    getCategories(),
    searchServices({
      ...(category ? { category } : {}),
      ...(q ? { q } : {}),
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

      <form className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center" action="/marketplace">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Rechercher un service…"
            className="pl-9"
            aria-label="Rechercher un service"
          />
        </div>
        {category && <input type="hidden" name="category" value={category} />}
        <Button type="submit" variant="outline">
          Rechercher
        </Button>
      </form>

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
                href={`/marketplace?${new URLSearchParams({ ...(category ? { category } : {}), ...(q ? { q } : {}), page: String(p) }).toString()}`}
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
