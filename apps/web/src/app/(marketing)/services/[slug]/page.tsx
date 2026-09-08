import Link from 'next/link';
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
import { mockServices } from '@/lib/mock-data';

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = mockServices.find((s) => s.slug === slug);
  return { title: service?.title ?? 'Service introuvable' };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = mockServices.find((s) => s.slug === slug);

  if (!service) notFound();

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
          <div className="aspect-video w-full rounded-xl bg-muted" />

          <Badge variant="outline" className="mt-6">
            {service.category}
          </Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{service.title}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm">
            <Star className="size-4 fill-current text-amber-500" aria-hidden="true" />
            {service.rating}{' '}
            <span className="text-muted-foreground">({service.reviewCount} avis)</span>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-2xl">
                {service.price.toLocaleString('fr-FR')} {service.currency}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Link
                href={`/providers/${service.provider.slug}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                  {service.provider.avatarInitials}
                </span>
                {service.provider.name}
              </Link>
              <Button size="lg">Réserver ce service</Button>
              <p className="text-center text-xs text-muted-foreground">
                Vous ne serez débité qu'après confirmation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
