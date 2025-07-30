
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; 
    }

    if (user) {
      router.replace('/app');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Mengarahkan...</p>
    </div>
  );
}
