// src/app/pending/page.tsx
'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function PendingContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <Icons.logo className="h-16 w-16" />
                </div>
                <CardTitle>รอการอนุมัติ (Pending Approval)</CardTitle>
                <CardDescription>
                    บัญชีของคุณ ({email}) ได้ถูกส่งไปให้ผู้ดูแลระบบเพื่อทำการอนุมัติแล้ว
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground mb-6">กรุณารอการอนุมัติจากผู้ดูแลระบบ</p>
                <Button asChild className="w-full">
                    <Link href="/login">
                        กลับไปหน้า Login
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}


export default function PendingPage() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Suspense fallback={<div>Loading...</div>}>
            <PendingContent />
        </Suspense>
      </div>
    )
}
