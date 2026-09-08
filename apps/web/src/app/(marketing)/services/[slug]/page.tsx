import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Star } from 'lucide-react';
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@flowmarket/ui';
import { ApiError, getServiceBySlug } from '@/lib/api';
import { FavoriteButton } from '@/components/favorite-button';

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

async function loadService(slug: string) {
  try {
    return await getServiceBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await loadService(slug);
  return {
    title: service?.title ?? 'Service introuvable',
    description: service?.description,
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await loadService(slug);

  if (!service) notFound();

  const providerName =
    service.provider.user.profile != null
      ? `${service.provider.user.profile.firstName} ${service.provider.user.profile.lastName}`
      : service.provider.businessName;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/marketplace">Explorer</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{service.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {service.images[0] ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <Image
                src={service.images[0].url}
                alt={service.title}
                fill
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-xl bg-muted" />
          )}

          <Badge variant="outline" className="mt-6">
            {service.category.name}
          </Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{service.title}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm">
            <Star className="size-4 fill-current text-amber-500" aria-hidden="true" />
            {service.rating.average > 0 ? service.rating.average : 'Nouveau'}{' '}
            <span className="text-muted-foreground">({service.rating.count} avis)</span>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>

          {service.options.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-medium">Options disponibles</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {service.options.map((option) => (
                  <li key={option.id} className="flex justify-between">
                    <span>{option.name}</span>
                    <span>
                      +{Number(option.priceDelta).toLocaleString('fr-FR')} {service.currency}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {service.reviews.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Avis clients</h2>
              <div className="space-y-4">
                {service.reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Star className="size-4 fill-current text-amber-500" aria-hidden="true" />
                        {review.rating}
                        <span className="text-muted-foreground">
                          — {review.client.profile?.firstName ?? 'Client FlowMarket'}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-2xl">
                {Number(service.basePrice).toLocaleString('fr-FR')} {service.currency}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Link
                href={`/providers/${service.provider.slug}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                  {providerName.slice(0, 2).toUpperCase()}
                </span>
                {providerName}
              </Link>
              <Button size="lg">Réserver ce service</Button>
              <p className="text-center text-xs text-muted-foreground">
                Vous ne serez débité qu&apos;après confirmation.
              </p>
            </CardContent>
          </Card>
          <FavoriteButton serviceId={service.id} />
        </div>
      </div>
    </div>
  );
}
