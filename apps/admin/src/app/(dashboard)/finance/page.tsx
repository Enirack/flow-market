'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@flowmarket/ui';
import {
  type AdminPayout,
  type FinanceOverview,
  approvePayout,
  getAdminPayouts,
  getFinanceOverview,
  rejectPayout,
} from '@/lib/api';

const STATUS_VARIANT: Record<string, 'outline' | 'success' | 'destructive' | 'secondary'> = {
  REQUESTED: 'outline',
  APPROVED: 'secondary',
  PROCESSING: 'secondary',
  PAID: 'success',
  REJECTED: 'destructive',
  FAILED: 'destructive',
};

export default function AdminFinancePage() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[] | null>(null);

  async function load() {
    const [overviewRes, payoutsRes] = await Promise.all([getFinanceOverview(), getAdminPayouts('REQUESTED')]);
    setOverview(overviewRes);
    setPayouts(payoutsRes);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleApprove(id: string) {
    await approvePayout(id);
    await load();
  }

  async function handleReject(id: string) {
    await rejectPayout(id, 'Rejeté par un administrateur');
    await load();
  }

  if (!overview || !payouts) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Finance</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenus totaux</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(overview.totalRevenue).toLocaleString('fr-FR')} XOF</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Commission plateforme</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(overview.totalCommission).toLocaleString('fr-FR')} XOF</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Virements en attente d'approbation</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun virement en attente.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <Card key={payout.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="font-medium">
                      {payout.provider.businessName} · {Number(payout.amount).toLocaleString('fr-FR')}{' '}
                      {payout.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payout.method} · {new Date(payout.requestedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[payout.status] ?? 'outline'}>{payout.status}</Badge>
                    <Button size="sm" onClick={() => handleApprove(payout.id)}>
                      Approuver
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleReject(payout.id)}>
                      Rejeter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
