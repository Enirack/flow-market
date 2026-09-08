import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FlowMarket Admin',
    template: '%s | FlowMarket Admin',
  },
  description: 'Back-office FlowMarket.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <div className="flex min-h-screen">
          <aside className="w-60 shrink-0 border-r border-neutral-200 p-4">
            <nav className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-neutral-900">FlowMarket Admin</span>
            </nav>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
