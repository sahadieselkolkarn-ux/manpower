// src/app/admin/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac/permissions';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile && !userProfile.isAdmin) {
      router.replace('/dashboard');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile || !userProfile.isAdmin) {
    return <div>Loading or checking permissions...</div>;
  }

  return <>{children}</>;
}
