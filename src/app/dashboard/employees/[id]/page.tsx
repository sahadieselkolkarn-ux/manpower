"use client";
import { use, useState } from "react";
import { doc, DocumentReference } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import FullPageLoader from "@/components/full-page-loader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Employee } from "@/types/employee";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPersonKey } from "@/lib/tax/utils";

export default function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const router = useRouter();
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const employeeRef = useMemoFirebase(
    () => (db ? (doc(db, "employees", id) as DocumentReference<Employee>) : null),
    [db, id]
  );
  const {
    data: employee,
    isLoading: isLoadingEmployee,
    error,
  } = useDoc<Employee>(employeeRef);

  const canManage =
    userProfile?.isAdmin || (userProfile?.roleIds || []).includes("HR_MANAGER");
  const isLoading = authLoading || isLoadingEmployee;
  
  const handleOpenTaxProfile = () => {
    if (!employee) return;
    const personKey = getPersonKey(employee.employeeType, employee.id);
    router.push(`/dashboard/hr/tax-profiles/${personKey}`);
  }

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (error) {
    return (
      <div className="p-8 text-destructive">
        Error loading employee: {error.message}
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Employee not found.
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Employee List
      </Button>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-headline">{`${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`}</CardTitle>
              <CardDescription>
                Employee Code: <span className="font-mono">{employee.employeeCode}</span>
              </CardDescription>
            </div>
             <div className="flex flex-col items-end gap-2">
               <Badge variant="outline" className="text-lg">
                {employee.employmentStatus}
              </Badge>
              <Button onClick={handleOpenTaxProfile} variant="secondary">แบบฟอร์ม ล.ย.01</Button>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add more employee details here in tabs later */}
        </CardContent>
      </Card>
    </div>
  );
}
