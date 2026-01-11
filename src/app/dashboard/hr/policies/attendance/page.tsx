// This is a placeholder file for the /dashboard/hr/policies/attendance route.
// The full implementation will be provided in a future step.
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { canManageHrSettings } from '@/lib/authz';

export default function AttendancePolicyPage() {
  const { userProfile } = useAuth();
  const canManage = canManageHrSettings(userProfile);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Office Attendance Policy</h1>
          <p className="text-muted-foreground">Define rules for late arrivals, absences, and leave for office employees.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Under Construction</CardTitle>
          <CardDescription>This feature is being built.</CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex flex-col items-center justify-center">
            <Construction className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground mt-4">The form to edit the company-wide attendance policy will appear here.</p>
            {!canManage && <p className="text-sm text-destructive mt-2">You have read-only access.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
