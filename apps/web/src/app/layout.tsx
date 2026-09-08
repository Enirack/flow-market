import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FlowMarket',
    template: '%s | FlowMarket',
  },
  description: 'La marketplace de services professionnels.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-neutral-200 px-6 py-4">
            <span className="text-lg font-semibold">FlowMarket</span>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-neutral-200 px-6 py-4 text-sm text-neutral-500">
            © {new Date().getFullYear()} FlowMarket
          </footer>
        </div>
      </body>
    </html>
  );
}
