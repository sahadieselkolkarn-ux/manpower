// src/app/pending/page.tsx
'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PendingContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <h1>Application Submitted</h1>
            <p>Your account {email && `(${email})`} has been created and is now pending approval from an administrator.</p>
            <p>Please check back later or contact support if you have any questions.</p>
            <br />
            <Link href="/login">
                <button>Back to Login</button>
            </Link>
        </div>
    );
}


export default function PendingPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PendingContent />
        </Suspense>
    )
}
