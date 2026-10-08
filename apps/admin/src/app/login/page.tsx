import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@flowmarket/ui';
import { LoginForm } from './login-form';

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">FlowMarket Admin</CardTitle>
          <CardDescription>Réservé aux administrateurs de la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
