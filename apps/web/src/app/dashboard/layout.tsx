/**
 * Layout de l'espace client authentifié.
 * La protection de route (vérification de session) sera ajoutée en Phase 3.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-neutral-200 p-4">
        <nav className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-neutral-900">Mon espace</span>
        </nav>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
