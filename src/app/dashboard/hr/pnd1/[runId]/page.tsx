// This is a placeholder file for the /dashboard/hr/pnd1/[runId] route.
// The full implementation will be provided in a future step.
'use client';

import { use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function Pnd1RunDetailsPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">P.N.D.1 Run: {runId}</h1>
          <p className="text-muted-foreground">Details and actions for this tax run.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under Construction</CardTitle>
          <CardDescription>This feature is being built.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex flex-col items-center justify-center">
            <Construction className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mt-4">The details of the run, line items, and export buttons will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
