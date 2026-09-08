import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <p className="text-sm text-neutral-600">Cette page n&apos;existe pas ou plus.</p>
      <Link href="/" className="text-sm font-medium underline">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
