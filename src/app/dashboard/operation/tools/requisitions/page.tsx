
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

export default function RequisitionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">จัดการการเบิก (Requisitions)</h1>
          <p className="text-muted-foreground">This page is under construction.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under Construction</CardTitle>
          <CardDescription>This feature is being built.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex flex-col items-center justify-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mt-4">This page is under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
