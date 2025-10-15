import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vercel Integration Server',
  description: 'Deploy AI assistant servers to Vercel with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}





