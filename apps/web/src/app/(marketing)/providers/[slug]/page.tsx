import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Star } from 'lucide-react';
import { Badge, Card, CardFooter, CardHeader, CardTitle, EmptyState } from '@flowmarket/ui';
import { ApiError, getProviderBySlug } from '@/lib/api';

interface ProviderPageProps {
  params: Promise<{ slug: string }>;
}

async function loadProvider(slug: string) {
  try {
    return await getProviderBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await loadProvider(slug);
  return {
    title: provider?.businessName ?? 'Prestataire introuvable',
    description: provider?.bio ?? undefined,
  };
}

export default async function ProviderProfilePage({ params }: ProviderPageProps) {
  const { slug } = await params;
  const provider = await loadProvider(slug);

  if (!provider) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-secondary text-2xl font-semibold text-secondary-foreground">
          {provider.businessName.slice(0, 2).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{provider.businessName}</h1>
          <div className="mt-1 flex items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-current text-amber-500" aria-hidden="true" />
              {provider.ratingAvg} ({provider.ratingCount} avis)
            </span>
          </div>
        </div>
      </div>

      {provider.bio && (
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:mx-0 sm:text-left">
          {provider.bio}
        </p>
      )}

      <h2 className="mt-10 mb-4 text-lg font-semibold tracking-tight">Services proposés</h2>
      {provider.services.length === 0 ? (
        <EmptyState title="Aucun service publié pour le moment" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {provider.services.map((service) => (
            <Link key={service.id} href={`/services/${service.slug}`} className="group block">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                {service.images[0] ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
                    <Image
                      src={service.images[0].url}
                      alt={service.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-t-xl bg-muted" />
                )}
                <CardHeader>
                  <Badge variant="outline" className="mb-1 w-fit">
                    {service.category.name}
                  </Badge>
                  <CardTitle className="line-clamp-2 text-base">{service.title}</CardTitle>
                </CardHeader>
                <CardFooter className="flex items-center justify-between">
                  <span className="font-semibold">
                    {Number(service.basePrice).toLocaleString('fr-FR')} {service.currency}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
