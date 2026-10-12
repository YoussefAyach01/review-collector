import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Avis Facile · Avis Google et retours privés', template: '%s · Avis Facile' },
  description:
    'Un lien ou un QR code : les clients satisfaits partent vers votre avis Google, les autres vous écrivent en privé.',
  icons: { icon: 'data:,' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
