// src/app/dashboard/layout.tsx
'use client';
import React from 'react';
import FullPageLoader from '@/components/full-page-loader';
import SidebarLayout from '@/components/sidebar-layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuth();

  React.useEffect(() => {
    if (loading) {
      return; // Still loading, wait for the next render
    }
    if (!user) {
      router.replace(`/login?redirect=${pathname}`);
    }
  }, [user, loading, router, pathname]);

  if (loading || !user || !userProfile) {
    return <FullPageLoader />;
  }
  
  // All checks passed, render the protected content.
  return <>{children}</>;
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarLayout>
        {children}
      </SidebarLayout>
    </AuthGuard>
  );
}
