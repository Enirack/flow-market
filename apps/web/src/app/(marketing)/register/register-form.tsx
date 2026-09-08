'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, Button, Input, Label } from '@flowmarket/ui';
import { ApiError, register } from '@/lib/api';
import { setAccessToken } from '@/lib/auth-client';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    try {
      const result = await register({
        email: String(formData.get('email')),
        password: String(formData.get('password')),
        firstName: String(formData.get('firstName')),
        lastName: String(formData.get('lastName')),
      });
      setAccessToken(result.accessToken);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
        <Button type="submit" className="mt-2" disabled={pending}>
          {pending ? 'Création…' : 'Créer mon compte'}
        </Button>
      </form>
    </>
  );
}
