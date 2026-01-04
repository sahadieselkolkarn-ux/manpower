// src/app/office/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac/permissions';
import { useRouter } from 'next/navigation';

export default function OfficeLayout({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile && !hasPermission(userProfile, 'OFFICE_ACCESS')) {
      router.replace('/dashboard');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile || !hasPermission(userProfile, 'OFFICE_ACCESS')) {
    return <div>Loading or checking permissions...</div>;
  }

  return <>{children}</>;
}
