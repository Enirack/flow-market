'use client';

import { Button } from '@flowmarket/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Quelque chose s'est mal passé."}
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
