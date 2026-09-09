'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton } from '@flowmarket/ui';
import { type Payout, type ProviderBalance, getMyBalance, getMyPayouts, requestPayout } from '@/lib/api';

const STATUS_VARIANT: Record<string, 'outline' | 'success' | 'destructive' | 'secondary'> = {
  REQUESTED: 'outline',
  APPROVED: 'secondary',
  PROCESSING: 'secondary',
  PAID: 'success',
  REJECTED: 'destructive',
  FAILED: 'destructive',
};

export default function ProviderEarningsPage() {
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [balanceRes, payoutsRes] = await Promise.all([getMyBalance(), getMyPayouts()]);
    setBalance(balanceRes);
    setPayouts(payoutsRes);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    try {
      await requestPayout({
        amount: Number(amount),
        method: 'MOBILE_MONEY',
        destinationDetails: { phoneNumber, countryCode: '221' },
      });
      setAmount('');
      setPhoneNumber('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La demande a échoué.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!balance || !payouts) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Revenus</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Number(balance.availableAmount).toLocaleString('fr-FR')} {balance.currency}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              {Number(balance.pendingAmount).toLocaleString('fr-FR')} {balance.currency}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Libéré une fois la prestation marquée comme terminée.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demander un virement (Mobile Money)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="payout-amount">Montant (XOF)</Label>
              <Input id="payout-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="payout-phone">Numéro Mobile Money</Label>
              <Input
                id="payout-phone"
                placeholder="77 123 45 67"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                disabled={submitting || !amount || !phoneNumber}
                onClick={handleRequest}
                className="w-full"
              >
                {submitting ? 'Envoi…' : 'Demander'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Historique des virements</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun virement demandé pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <Card key={payout.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-6">
                  <div>
                    <p className="font-medium">
                      {Number(payout.amount).toLocaleString('fr-FR')} {payout.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payout.requestedAt).toLocaleString('fr-FR')}
                      {payout.rejectionReason ? ` — ${payout.rejectionReason}` : ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[payout.status] ?? 'outline'}>{payout.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
