'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold">Erreur critique</h1>
          <p className="text-sm text-neutral-600">
            L&apos;application a rencontré une erreur inattendue.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
