import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'VFBA · Attendance System',
  description: 'Victoria Falls Boxing Academy — real-time attendance and training management.',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png' },
};

export const viewport = {
  themeColor: '#A61E22',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
