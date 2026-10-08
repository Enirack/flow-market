'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, Input, Skeleton } from '@flowmarket/ui';
import { type AdminDispute, getAdminDisputes, resolveDispute } from '@/lib/api';

const STATUS_VARIANT: Record<string, 'outline' | 'success' | 'destructive' | 'secondary'> = {
  OPEN: 'outline',
  UNDER_REVIEW: 'secondary',
  RESOLVED: 'success',
  REJECTED: 'destructive',
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[] | null>(null);
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});

  async function load() {
    const res = await getAdminDisputes({});
    setDisputes(res.disputes);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleResolve(id: string, status: 'RESOLVED' | 'REJECTED') {
    const resolution = resolutionDrafts[id];
    if (!resolution) return;
    await resolveDispute(id, { status, resolution });
    await load();
  }

  if (!disputes) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Litiges</h1>

      {disputes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun litige pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {disputes.map((dispute) => (
            <Card key={dispute.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{dispute.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      {dispute.booking.client.profile
                        ? `${dispute.booking.client.profile.firstName} ${dispute.booking.client.profile.lastName}`
                        : 'Client'}{' '}
                      vs {dispute.booking.provider.businessName}
                    </p>
                    {dispute.details && <p className="mt-1 text-sm">{dispute.details}</p>}
                    {dispute.resolution && (
                      <p className="mt-1 text-sm text-muted-foreground">Résolution : {dispute.resolution}</p>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANT[dispute.status] ?? 'outline'}>{dispute.status}</Badge>
                </div>

                {(dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Résolution…"
                      className="max-w-sm"
                      value={resolutionDrafts[dispute.id] ?? ''}
                      onChange={(e) =>
                        setResolutionDrafts((current) => ({ ...current, [dispute.id]: e.target.value }))
                      }
                    />
                    <Button size="sm" onClick={() => handleResolve(dispute.id, 'RESOLVED')}>
                      Résoudre en faveur du client
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleResolve(dispute.id, 'REJECTED')}>
                      Rejeter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
