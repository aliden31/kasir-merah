
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Jangan lakukan apa-apa jika masih memuat
    if (loading) {
      return;
    }

    const isAuthPage = pathname === '/login';

    // Jika pengguna sudah login dan berada di halaman login, arahkan ke aplikasi
    if (user && isAuthPage) {
      router.replace('/app');
    }
    
    // Jika pengguna belum login dan tidak berada di halaman login, arahkan ke login
    if (!user && pathname !== '/login') {
       router.replace('/login');
    }

  }, [user, loading, router, pathname]);

  // Sembari menunggu, tampilkan pesan memuat untuk menghindari kedipan layar
  if (loading) {
    return (
       <div className="flex h-screen items-center justify-center">
          Memuat aplikasi...
      </div>
    );
  }

  // Jika sudah tidak loading dan pengguna ada, halaman app akan dirender
  // oleh layout. Jika tidak ada pengguna, akan diarahkan ke login.
  // Render null atau pesan singkat karena pengalihan sedang berlangsung.
  if (!user && pathname !== '/login') {
     return (
       <div className="flex h-screen items-center justify-center">
          Mengarahkan ke halaman login...
      </div>
    );
  }

  // Render children jika user sudah ada dan berada di halaman app,
  // atau jika berada di halaman login. Komponen anak (layout) akan
  // menangani render halaman yang sesuai.
  return null;
}
