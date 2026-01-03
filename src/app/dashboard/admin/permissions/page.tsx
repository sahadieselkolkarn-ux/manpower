'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function AdminPermissionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Permissions</h1>
          <p className="text-muted-foreground">Manage role-based permissions for different system modules.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under Construction</CardTitle>
          <CardDescription>This feature is being built.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex flex-col items-center justify-center">
            <Construction className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mt-4">A matrix for assigning permissions to roles will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
