// This is a placeholder file for the /dashboard/billing/runs route.
// The full implementation will be provided in a future step.
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function BillingRunsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Billing Runs</h1>
          <p className="text-muted-foreground">Create and manage billing runs from approved timesheets.</p>
        </div>
        {/* <Button asChild>
            <Link href="/dashboard/billing/runs/new">
                <PlusCircle className="mr-2 h-4 w-4"/>
                New Billing Run
            </Link>
        </Button> */}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under Construction</CardTitle>
          <CardDescription>This feature is being built.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex flex-col items-center justify-center">
            <Construction className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mt-4">The list of billing runs will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
