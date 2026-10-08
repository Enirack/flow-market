'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, Button, Input, Label } from '@flowmarket/ui';
import { ApiError, login } from '@/lib/api';
import { setAccessToken } from '@/lib/auth-client';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    try {
      const result = await login(String(formData.get('email')), String(formData.get('password')));
      if (result.user.role !== 'ADMIN') {
        setError('Ce compte ne dispose pas des droits administrateur.');
        return;
      }
      setAccessToken(result.accessToken);
      router.push('/');
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="mt-2" disabled={pending}>
          {pending ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </>
  );
}
