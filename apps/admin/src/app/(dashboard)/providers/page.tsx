'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, Skeleton } from '@flowmarket/ui';
import { type AdminProvider, getAdminProviders, reviewProviderVerification } from '@/lib/api';

const VERIFICATION_VARIANT: Record<string, 'success' | 'destructive' | 'outline'> = {
  APPROVED: 'success',
  REJECTED: 'destructive',
  PENDING: 'outline',
};

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<AdminProvider[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    const res = await getAdminProviders({ ...(statusFilter ? { verificationStatus: statusFilter } : {}) });
    setProviders(res.providers);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    await reviewProviderVerification(id, { status });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Prestataires</h1>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Toutes les vérifications</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvé</option>
          <option value="REJECTED">Rejeté</option>
        </select>
      </div>

      {!providers ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-2">
          {providers.map((provider) => (
            <Card key={provider.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div>
                  <p className="font-medium">{provider.businessName}</p>
                  <p className="text-sm text-muted-foreground">
                    {provider.user.email} · {provider.ratingCount > 0 ? Number(provider.ratingAvg).toFixed(1) : 'Nouveau'}
                    {provider.balance && (
                      <> · Solde : {Number(provider.balance.availableAmount).toLocaleString('fr-FR')} XOF</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={VERIFICATION_VARIANT[provider.verification?.status ?? 'PENDING']}>
                    {provider.verification?.status ?? 'PENDING'}
                  </Badge>
                  {provider.verification?.status === 'PENDING' && (
                    <>
                      <Button size="sm" onClick={() => handleReview(provider.id, 'APPROVED')}>
                        Approuver
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleReview(provider.id, 'REJECTED')}>
                        Rejeter
                      </Button>
                    </>
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
