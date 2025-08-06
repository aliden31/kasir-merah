
'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AuthProvider, { useAuth } from '@/components/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useIdleTimer from '@/hooks/use-idle-timer';
import { logout } from '@/lib/auth-service';
import { useToast } from '@/hooks/use-toast';

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleIdle = async () => {
    if (user) {
       toast({
        title: "Sesi Anda Telah Berakhir",
        description: "Anda telah logout secara otomatis karena tidak ada aktivitas.",
        variant: "destructive",
      });
      await logout();
      router.replace('/login');
    }
  };

  // Set auto-logout timer for 6 hours
  useIdleTimer(6 * 60 * 60 * 1000, handleIdle);


  useEffect(() => {
    if (loading) return; 

    const isAuthRoute = pathname === '/login';
    const isAppRoute = pathname.startsWith('/app');
    const isRootRoute = pathname === '/';

    if (!user && !isAuthRoute && !isRootRoute) {
      router.replace('/login');
    } else if (user && isAuthRoute) {
       router.replace('/app');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Memuat aplikasi...</div>;
  }
  
  if (!user && !pathname.startsWith('/login') && pathname !== '/') {
     return <div className="flex h-screen items-center justify-center">Mengarahkan ke halaman login...</div>;
  }
  
  if (user && pathname === '/login') {
      return <div className="flex h-screen items-center justify-center">Mengarahkan ke aplikasi...</div>;
  }

  return <>{children}</>;
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <title>Toko Cepat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
           <AppContent>
              {children}
           </AppContent>
           <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
