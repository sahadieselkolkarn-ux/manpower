// src/app/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome</h1>
      <p>Please log in to continue.</p>
      <Link href="/login">Go to Login</Link>
    </div>
  );
}
