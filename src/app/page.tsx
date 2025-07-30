
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/app'); // Redirect to the main app page if logged in
      } else {
        router.replace('/login'); // Redirect to login if not logged in
      }
    }
  }, [user, loading, router]);

  return (
     <div className="flex h-screen items-center justify-center">
        Memuat aplikasi...
    </div>
  );
}
