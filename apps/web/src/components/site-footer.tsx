import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} FlowMarket. Tous droits réservés.</p>
        <nav className="flex gap-4" aria-label="Liens de pied de page">
          <Link href="/marketplace" className="hover:text-foreground">
            Explorer
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Tarifs
          </Link>
        </nav>
      </div>
    </footer>
  );
}
