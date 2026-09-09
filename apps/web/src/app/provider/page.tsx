'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ShoppingBag, Star, Wallet } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@flowmarket/ui';
import {
  type ProviderMe,
  type ProviderRecentBooking,
  type ProviderStats,
  getProviderMe,
  getProviderRecentBookings,
  getProviderStats,
} from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  DISPUTED: 'Litige',
};

export default function ProviderDashboardPage() {
  const [provider, setProvider] = useState<ProviderMe | null>(null);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [bookings, setBookings] = useState<ProviderRecentBooking[] | null>(null);

  useEffect(() => {
    void getProviderMe().then(setProvider);
    void getProviderStats().then(setStats);
    void getProviderRecentBookings().then(setBookings);
  }, []);

  if (!provider || !stats || !bookings) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const items = [
    { label: 'Revenus (30j)', value: `${Number(stats.revenue30d).toLocaleString('fr-FR')} XOF`, icon: Wallet },
    { label: 'Réservations à venir', value: String(stats.upcomingBookings), icon: CalendarDays },
    { label: 'Services publiés', value: String(stats.publishedServices), icon: ShoppingBag },
    {
      label: 'Note moyenne',
      value: stats.ratingCount > 0 ? Number(stats.ratingAvg).toFixed(1) : 'Nouveau',
      icon: Star,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tableau de bord prestataire</h1>
          <p className="mt-1 text-sm text-muted-foreground">{provider.businessName}</p>
        </div>
        <Badge variant={provider.isActive ? 'success' : 'outline'}>
          {provider.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Réservations récentes</h2>
        <Card>
          {bookings.length === 0 ? (
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Aucune réservation pour le moment.
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.client.profile
                        ? `${booking.client.profile.firstName} ${booking.client.profile.lastName}`
                        : 'Client FlowMarket'}
                    </TableCell>
                    <TableCell>{booking.items[0]?.service.title}</TableCell>
                    <TableCell>{new Date(booking.scheduledAt).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Badge variant={booking.status === 'COMPLETED' ? 'success' : 'outline'}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
