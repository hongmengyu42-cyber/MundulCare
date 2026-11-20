import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import MaintenanceGate from '@/components/MaintenanceGate';

const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'MundulCare - Hospital & Doctor Appointment Management',
  description: 'Book and manage doctor appointments easily with MundulCare',
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/icon.png',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${figtree.variable} bg-white dark:bg-[#090D16]`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('mundulcare-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark' || (!stored && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col antialiased bg-[#f8fafc] dark:bg-[#090D16] text-slate-800 dark:text-slate-100 font-sans selection:bg-[#aa5588] selection:text-white transition-colors duration-150"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <MaintenanceGate>{children}</MaintenanceGate>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
