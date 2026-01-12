// src/app/admin/layout.tsx
'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

// This old layout is deprecated. We redirect any requests within /admin to /dashboard/admin.
export default function DeprecatedAdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    redirect('/dashboard/admin');
  }, []);

  return (
    <div>
        <h1>Redirecting to Dashboard...</h1>
        {children}
    </div>
    );
}
