
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// This page is deprecated in favor of the two new specific pages.
// We redirect to the manpower page as a sensible default.
export default function DeprecatedPositionsPage() {
  useEffect(() => {
    redirect('/dashboard/hr/master/manpower-positions');
  }, []);

  return null;
}
