// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Root Layout
// Purpose: App Router root layout — Inter font, providers, attune default theme.
// suppressHydrationWarning: ThemeProvider updates data-theme client-side, causing
// a one-tick mismatch from the SSR default.

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Attune Smart Forms',
    template: '%s | Attune Smart Forms',
  },
  description:
    'Forms, documents, and workflows for small businesses — build forms, fill your own PDFs, and automate what happens next.',
  icons: {
    icon: '/attune-icon.png',
    shortcut: '/attune-icon.png',
    apple: '/attune-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" data-theme="attune" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
