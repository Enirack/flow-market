import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button, EmptyState, Input } from '@flowmarket/ui';
import { mockCategories, mockServices } from '@/lib/mock-data';
import { ServiceCard } from '@/components/service-card';

export const metadata: Metadata = { title: 'Explorer les services' };

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const services = category ? mockServices.filter((s) => s.category === category) : mockServices;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Explorer les services</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {services.length} service{services.length > 1 ? 's' : ''} disponible
          {services.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un service…"
            className="pl-9"
            aria-label="Rechercher un service"
          />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Button variant={!category ? 'default' : 'outline'} size="sm" asChild>
          <Link href="/marketplace">Toutes les catégories</Link>
        </Button>
        {mockCategories.map((cat) => (
          <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" asChild>
            <Link href={`/marketplace?category=${encodeURIComponent(cat)}`}>{cat}</Link>
          </Button>
        ))}
      </div>

      {services.length === 0 ? (
        <EmptyState
          title="Aucun service trouvé"
          description="Essayez une autre catégorie ou revenez plus tard."
          action={
            <Button variant="outline" asChild>
              <Link href="/marketplace">Réinitialiser les filtres</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
