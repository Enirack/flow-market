'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
} from '@flowmarket/ui';
import {
  type BookingSummary,
  cancelBooking,
  createPaymentIntent,
  getMyBookings,
  simulateMockPayment,
} from '@/lib/api';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive' | 'success'> = {
  PENDING: 'outline',
  CONFIRMED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  DISPUTED: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  DISPUTED: 'Litige',
};

export default function DashboardBookingsPage() {
  const [bookings, setBookings] = useState<BookingSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  async function load() {
    try {
      setBookings(await getMyBookings());
    } catch {
      setError('Connectez-vous pour voir vos réservations.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCancel(id: string) {
    await cancelBooking(id, 'Annulée par le client');
    void load();
  }

  async function handlePay(orderId: string) {
    setPayingOrderId(orderId);
    try {
      const { clientPayload } = await createPaymentIntent(orderId);
      if (clientPayload.checkoutUrl) {
        window.location.href = clientPayload.checkoutUrl;
        return;
      }
      if (clientPayload.mockPaymentId) {
        // Mode developpement (aucune cle de paiement reelle configuree) : le
        // paiement est confirme immediatement via le webhook simule, ce qui
        // exerce le meme chemin de code qu'un vrai webhook provider.
        await simulateMockPayment(clientPayload.mockPaymentId, 'succeeded');
        await load();
      }
    } finally {
      setPayingOrderId(null);
    }
  }

  if (error) {
    return <EmptyState title={error} action={<Button asChild><Link href="/login">Se connecter</Link></Button>} />;
  }

  if (!bookings) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="Aucune réservation"
        description="Explorez la marketplace pour réserver votre premier service."
        action={<Button asChild><Link href="/marketplace">Explorer les services</Link></Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mes réservations</h1>
      {bookings.map((booking) => {
        const isPaid = booking.order?.payments?.some((payment) => payment.status === 'SUCCEEDED') ?? false;
        const canPay = booking.status === 'CONFIRMED' && booking.order && !isPaid;

        return (
          <Card key={booking.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{booking.items[0]?.service.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(booking.scheduledAt).toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
                {isPaid && <Badge variant="success">Payée</Badge>}
                {booking.order && (
                  <span className="text-sm font-medium">
                    {Number(booking.order.totalAmount).toLocaleString('fr-FR')} {booking.order.currency}
                  </span>
                )}
                {canPay && (
                  <Button
                    size="sm"
                    disabled={payingOrderId === booking.order!.id}
                    onClick={() => handlePay(booking.order!.id)}
                  >
                    {payingOrderId === booking.order!.id ? 'Paiement…' : 'Payer maintenant'}
                  </Button>
                )}
                {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                  <Button variant="outline" size="sm" onClick={() => handleCancel(booking.id)}>
                    Annuler
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
