import type { Metadata, Viewport } from 'next';
import './globals.css';
import SessionActivity from '@/components/session-activity';

import BottomNav from '@/components/BottomNav';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#00E5FF',
};

export const metadata: Metadata = {
  title: 'TraceLab OSINT | Workbench',
  description: 'Plataforma OSINT e Laboratório Forense Digital.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TraceLab',
  },
  icons: {
    icon: '/logo_atual.png',
    apple: '/logo_atual.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'TraceLab',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionActivity />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
