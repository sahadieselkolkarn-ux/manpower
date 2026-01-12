// src/app/admin/users/page.tsx
'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

// This old admin page is deprecated. We redirect to the new dashboard location.
export default function DeprecatedAdminUsersPage() {
    useEffect(() => {
        redirect('/dashboard/admin/users');
    }, []);

    return null;
}
