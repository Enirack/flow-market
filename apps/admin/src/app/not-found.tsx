import Link from 'next/link';
import { Button } from '@flowmarket/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <p className="text-sm text-muted-foreground">Cette page n&apos;existe pas ou plus.</p>
      <Button asChild>
        <Link href="/">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
