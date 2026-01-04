// src/app/admin/layout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/rbac/permissions';
import { useRouter } from 'next/navigation';
import FullPageLoader from '@/components/full-page-loader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userProfile?.isAdmin) {
      router.replace('/dashboard');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile) {
    return <FullPageLoader />;
  }

  if (!userProfile.isAdmin) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
            <Card className="m-4 text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <ShieldAlert className="text-destructive" />
                        Access Denied
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>You do not have permission to view this page. Redirecting...</p>
                </CardContent>
            </Card>
        </div>
      )
  }

  return <>{children}</>;
}
