'use client';

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
      <p className="text-sm text-neutral-600">
        {error.message || "Quelque chose s'est mal passé."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
      >
        Réessayer
      </button>
    </div>
  );
}
