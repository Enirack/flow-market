import Link from 'next/link';
import { CalendarDays, MessageSquare, ShoppingBag, Star } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@flowmarket/ui';

const STATS = [
  { label: 'Commandes en cours', value: '0', icon: ShoppingBag },
  { label: 'Réservations à venir', value: '0', icon: CalendarDays },
  { label: 'Messages non lus', value: '0', icon: MessageSquare },
  { label: 'Avis laissés', value: '0', icon: Star },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bienvenue sur votre espace client.</p>

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
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Commandes récentes</h2>
        <EmptyState
          icon={<ShoppingBag />}
          title="Aucune commande pour le moment"
          description="Explorez la marketplace pour réserver votre premier service."
          action={
            <Button asChild>
              <Link href="/marketplace">Explorer les services</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
