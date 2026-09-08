import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Star } from 'lucide-react';
import { Badge, EmptyState } from '@flowmarket/ui';
import { mockProviders, mockServices } from '@/lib/mock-data';
import { ServiceCard } from '@/components/service-card';

interface ProviderPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: mockProviders[slug]?.name ?? 'Prestataire introuvable' };
}

export default async function ProviderProfilePage({ params }: ProviderPageProps) {
  const { slug } = await params;
  const provider = mockProviders[slug];

  if (!provider) notFound();

  const services = mockServices.filter((s) => s.provider.slug === slug);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-secondary text-2xl font-semibold text-secondary-foreground">
          {provider.avatarInitials}
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{provider.name}</h1>
          <div className="mt-1 flex items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-current text-amber-500" aria-hidden="true" />
              {provider.rating} ({provider.reviewCount} avis)
            </span>
            <Badge variant="secondary">Membre depuis {provider.memberSince}</Badge>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:mx-0 sm:text-left">
        {provider.bio}
      </p>

      <h2 className="mt-10 mb-4 text-lg font-semibold tracking-tight">Services proposés</h2>
      {services.length === 0 ? (
        <EmptyState title="Aucun service publié pour le moment" />
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
