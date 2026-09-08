import { CalendarDays, ShoppingBag, Star, Wallet } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@flowmarket/ui';

const STATS = [
  { label: 'Revenus (30j)', value: '135 000 XOF', icon: Wallet },
  { label: 'Réservations à venir', value: '2', icon: CalendarDays },
  { label: 'Services publiés', value: '2', icon: ShoppingBag },
  { label: 'Note moyenne', value: '4.8', icon: Star },
];

const RECENT_BOOKINGS = [
  {
    client: 'Aïcha Diallo',
    service: 'Création de site vitrine',
    date: '01/09/2026',
    status: 'Terminée',
  },
  { client: 'Moussa Koné', service: 'Création de logo', date: '05/09/2026', status: 'Confirmée' },
];

export default function ProviderDashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tableau de bord prestataire</h1>
          <p className="mt-1 text-sm text-muted-foreground">Karim Studio</p>
        </div>
        <Badge variant="secondary">Plan Pro</Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
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
              {RECENT_BOOKINGS.map((booking) => (
                <TableRow key={`${booking.client}-${booking.date}`}>
                  <TableCell className="font-medium">{booking.client}</TableCell>
                  <TableCell>{booking.service}</TableCell>
                  <TableCell>{booking.date}</TableCell>
                  <TableCell>
                    <Badge variant={booking.status === 'Terminée' ? 'success' : 'outline'}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
