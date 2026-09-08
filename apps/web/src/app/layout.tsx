import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FlowMarket',
  description: 'La marketplace de services professionnels.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
