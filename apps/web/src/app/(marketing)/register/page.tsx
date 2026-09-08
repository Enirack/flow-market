import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@flowmarket/ui';

export const metadata: Metadata = { title: 'Créer un compte' };

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Créer un compte</CardTitle>
          <CardDescription>Rejoignez FlowMarket en tant que client ou prestataire.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" name="firstName" autoComplete="given-name" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" name="lastName" autoComplete="family-name" required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-muted-foreground">
                Au moins 8 caractères, une lettre et un chiffre.
              </p>
            </div>
            <Button type="submit" className="mt-2">
              Créer mon compte
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
