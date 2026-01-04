// src/app/dashboard/layout.tsx
'use client';
import React from 'react';
import FullPageLoader from '@/components/full-page-loader';
import SidebarLayout from '@/components/sidebar-layout';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { RolesProvider } from "@/context/RolesContext";
import { AuthProvider } from '@/context/AuthContext';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (loading) {
      return; // Still loading, wait for the next render
    }
    if (!user) {
      router.replace(`/login?redirect=${pathname}`);
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return <FullPageLoader />;
  }
  
  // All checks passed, render the protected content.
  return <SidebarLayout>{children}</SidebarLayout>;
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
        <AuthProvider>
          <RolesProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </RolesProvider>
        </AuthProvider>
    </FirebaseClientProvider>
  );
}
