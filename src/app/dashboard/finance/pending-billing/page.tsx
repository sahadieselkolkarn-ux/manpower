'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function PendingBillingPage() {

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Pending Payment & Billing
        </h1>
      </div>
      <p className="text-muted-foreground">
        Items that have been approved by HR and are ready for financial processing.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Ready for Processing</CardTitle>
          <CardDescription>
            The following items are locked and can be processed for payroll or invoicing.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="h-24 flex items-center justify-center text-muted-foreground">
             This page is under construction. Approved timesheets will appear here.
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
