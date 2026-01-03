// This is a placeholder file for the /dashboard/hr/pnd1/new route.
// The full implementation will be provided in a future step.
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function NewPnd1Page() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">New P.N.D.1 Run</h1>
          <p className="text-muted-foreground">Generate a new monthly P.N.D.1 tax form.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under Construction</CardTitle>
          <CardDescription>This feature is being built.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex flex-col items-center justify-center">
            <Construction className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mt-4">The form to create a new run will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
