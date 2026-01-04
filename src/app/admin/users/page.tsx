// src/app/admin/users/page.tsx
'use client';
// Basic implementation for Admin Users page
import { hasPermission } from '@/lib/rbac/permissions';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminUsersPage() {
    const { userProfile } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (userProfile && !userProfile.isAdmin) {
            router.replace('/dashboard');
        }
    }, [userProfile, router]);


    if (!userProfile || !userProfile.isAdmin) {
        return <p>Access Denied. Redirecting...</p>;
    }

    return (
        <div>
            <h1>User Management</h1>
            <p>This is a placeholder for the user management interface.</p>
            <ul>
                <li>List users from Firestore</li>
                <li>Edit user role, department, and isActive status</li>
                <li>Search for users</li>
            </ul>
        </div>
    )
}
