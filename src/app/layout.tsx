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
  title: 'TraceLab OSINT | Cyberpunk Forensics',
  description: 'Plataforma OSINT com autenticacao por passkeys e laboratorio forense digital.',
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
