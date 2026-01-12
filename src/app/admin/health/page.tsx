// src/app/admin/health/page.tsx
'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

// This old health page is deprecated. We redirect to the new dashboard location.
export default function DeprecatedHealthPage() {
  useEffect(() => {
    redirect('/dashboard');
  }, []);

  return (
    <div>
      <h1>Redirecting...</h1>
      <p>This page has moved. You will be redirected to the new dashboard shortly.</p>
    </div>
  );
}
