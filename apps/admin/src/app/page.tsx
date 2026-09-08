import { AlertTriangle, ShieldCheck, ShoppingBag, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@flowmarket/ui';

const KPIS = [
  { label: 'Utilisateurs', value: '3', icon: Users },
  { label: 'Prestataires', value: '1', icon: ShieldCheck },
  { label: 'Services publiés', value: '2', icon: ShoppingBag },
  { label: 'GMV (30j)', value: '150 000 XOF', icon: Wallet },
  { label: 'Litiges ouverts', value: '0', icon: AlertTriangle },
];

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <p className="mt-1 text-sm text-muted-foreground">Vue d’ensemble de la plateforme.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {KPIS.map(({ label, value, icon: Icon }) => (
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
