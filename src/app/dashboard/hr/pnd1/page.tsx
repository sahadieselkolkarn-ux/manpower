// This is a placeholder file for the /dashboard/hr/pnd1 route.
// The full implementation will be provided in a future step.
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

export default function Pnd1ListPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">P.N.D.1 Runs</h1>
          <p className="text-muted-foreground">Manage and generate monthly P.N.D.1 tax forms.</p>
        </div>
        <Button asChild>
            <Link href="/dashboard/hr/pnd1/new">
                <PlusCircle className="mr-2 h-4 w-4"/>
                New P.N.D.1 Run
            </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under Construction</CardTitle>
          <CardDescription>This feature is being built.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex flex-col items-center justify-center">
            <Construction className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mt-4">The list of P.N.D.1 runs will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
