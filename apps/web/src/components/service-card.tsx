import Link from 'next/link';
import { Star } from 'lucide-react';
import { Badge, Card, CardContent, CardFooter, CardHeader, CardTitle } from '@flowmarket/ui';
import type { SearchServiceHit } from '@/lib/api';

function initials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ServiceCard({ service }: { service: SearchServiceHit }) {
  return (
    <Link href={`/services/${service.slug}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <div className="aspect-video w-full rounded-t-xl bg-muted" />
        <CardHeader>
          <Badge variant="outline" className="mb-1 w-fit">
            {service.category}
          </Badge>
          <CardTitle className="line-clamp-2 text-base">{service.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
            {initials(service.providerName)}
          </span>
          {service.providerName}
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm">
            <Star className="size-4 fill-current text-amber-500" aria-hidden="true" />
            {service.rating > 0 ? service.rating : '—'}
            {service.reviewCount > 0 && (
              <span className="text-muted-foreground">({service.reviewCount})</span>
            )}
          </span>
          <span className="font-semibold">
            {service.price.toLocaleString('fr-FR')} {service.currency}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
