import type { Metadata } from 'next';
import './globals.css';
import { AdminSidebar } from '@/components/admin-sidebar';

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
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
          <AdminSidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
