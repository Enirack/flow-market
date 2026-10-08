'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, Skeleton } from '@flowmarket/ui';
import { type AdminService, getAdminServices, unpublishService } from '@/lib/api';

const STATUS_VARIANT: Record<string, 'success' | 'outline' | 'secondary'> = {
  PUBLISHED: 'success',
  DRAFT: 'outline',
  ARCHIVED: 'secondary',
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<AdminService[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('PUBLISHED');

  async function load() {
    const res = await getAdminServices({ ...(statusFilter ? { status: statusFilter } : {}) });
    setServices(res.services);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleUnpublish(id: string) {
    await unpublishService(id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Services</h1>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="PUBLISHED">Publié</option>
          <option value="DRAFT">Brouillon</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
      </div>

      {!services ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div>
                  <p className="font-medium">{service.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {service.provider.businessName} · {service.category.name} ·{' '}
                    {Number(service.basePrice).toLocaleString('fr-FR')} {service.currency}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[service.status] ?? 'outline'}>{service.status}</Badge>
                  {service.status === 'PUBLISHED' && (
                    <Button variant="outline" size="sm" onClick={() => handleUnpublish(service.id)}>
                      Dépublier
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
