
'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DeprecatedPositionsPage() {
  useEffect(() => {
    redirect('/dashboard/hr/master/manpower-positions');
  }, []);

  return null;
}
