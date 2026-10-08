'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Users, Wallet, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from '@flowmarket/ui';
import { type FinanceOverview, getFinanceOverview } from '@/lib/api';

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFinanceOverview()
      .then(setOverview)
      .catch(() => setError('Connectez-vous en tant qu’administrateur pour voir ces données.'));
  }, []);

  if (error) {
    return <EmptyState title={error} action={<Button asChild><Link href="/login">Se connecter</Link></Button>} />;
  }

  if (!overview) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const items = [
    { label: 'Revenus totaux', value: `${Number(overview.totalRevenue).toLocaleString('fr-FR')} XOF`, icon: Wallet },
    {
      label: 'Commission plateforme',
      value: `${Number(overview.totalCommission).toLocaleString('fr-FR')} XOF`,
      icon: Wallet,
    },
    { label: 'Prestataires actifs', value: String(overview.activeProviders), icon: ShieldCheck },
    { label: 'Utilisateurs', value: String(overview.totalUsers), icon: Users },
    { label: 'Virements en attente', value: String(overview.pendingPayouts), icon: Wallet },
    { label: 'Litiges ouverts', value: String(overview.openDisputes), icon: AlertTriangle },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold">Vue d'ensemble</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
