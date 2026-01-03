'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedEmployeesPage() {
    const router = useRouter();
    useEffect(() => {
        // Default to the field employees view as it's more common in this domain
        router.replace('/dashboard/hr/employees/field');
    }, [router]);
    return null; // or a loading indicator
}
