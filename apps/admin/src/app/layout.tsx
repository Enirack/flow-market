import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FlowMarket Admin',
  description: 'Back-office FlowMarket.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
