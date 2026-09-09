'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, EmptyState, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@flowmarket/ui';
import { type BookingSummary, completeBooking, confirmBooking, getProviderBookings, rejectBooking } from '@/lib/api';

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

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState<BookingSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setBookings(await getProviderBookings());
    } catch {
      setError('Connectez-vous en tant que prestataire pour voir vos réservations.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function withReload(action: () => Promise<void>) {
    await action();
    void load();
  }

  if (error) return <EmptyState title={error} />;

  if (!bookings) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return <EmptyState title="Aucune réservation reçue pour le moment" />;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Réservations</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium">
                {booking.client?.profile
                  ? `${booking.client.profile.firstName} ${booking.client.profile.lastName}`
                  : 'Client'}
              </TableCell>
              <TableCell>{booking.items[0]?.service.title}</TableCell>
              <TableCell>{new Date(booking.scheduledAt).toLocaleString('fr-FR')}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {booking.status === 'PENDING' && (
                    <>
                      <Button size="sm" onClick={() => withReload(() => confirmBooking(booking.id))}>
                        Accepter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => withReload(() => rejectBooking(booking.id, 'Indisponible'))}
                      >
                        Refuser
                      </Button>
                    </>
                  )}
                  {booking.status === 'CONFIRMED' && (
                    <Button size="sm" variant="outline" onClick={() => withReload(() => completeBooking(booking.id))}>
                      Marquer terminée
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
