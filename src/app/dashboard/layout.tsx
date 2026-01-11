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

  // Global Interaction Guard: Periodically checks and cleans up Radix side-effects.
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      // Check if any Radix-based modal is currently open.
      const hasOpenModal = !!document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
      );

      // If no modals are open, forcefully remove any lingering styles that could block interaction.
      if (!hasOpenModal) {
        document.body.style.removeProperty('pointer-events');
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
        document.body.removeAttribute('data-scroll-locked');
        document.documentElement.removeAttribute('data-scroll-locked');
      }
    }, 250); // Run this check every 250ms.

    // Cleanup the interval when the component unmounts.
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures this runs only once for the lifetime of the component.


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
    <AuthGuard>
      {children}
    </AuthGuard>
  );
}
