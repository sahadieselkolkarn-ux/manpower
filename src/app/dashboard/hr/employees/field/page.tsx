

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Users } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { type Employee } from '@/types/employee';
import EmployeeForm from '@/components/forms/employee-form';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { ManpowerPosition } from '@/types/position';

export default function ManpowerEmployeesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const router = useRouter();

  const db = useFirestore();
  const { userProfile } = useAuth();

  const employeesQuery = useMemoFirebase(
    () => (db ? query(collection(db, 'employees'), where('employeeType', '==', 'FIELD')) : null),
    [db]
  );
  const { data: employees, isLoading: isLoadingEmployees, refetch: refetchEmployees } = useCollection<Employee>(employeesQuery);

  const positionsQuery = useMemoFirebase(() => (db ? collection(db, 'manpowerPositions') : null), [db]);
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(positionsQuery);

  const positionMap = useMemo(() => new Map(positions?.map(p => [p.id, p.name])), [positions]);

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

  const canManage = userProfile?.isAdmin || userProfile?.roleIds.includes('HR_MANAGER');
  const isLoading = isLoadingEmployees || isLoadingPositions;

  const handleSuccess = (employeeId?: string) => {
    refetchEmployees();
    if (employeeId) {
      router.push(`/dashboard/employees/${employeeId}`);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Users />
            Manpower Employees
        </h1>
        {canManage && (
          <Button onClick={handleAddEmployee}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Manage all field manpower, their information, and work history.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            A list of all field employees in your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Assignment Status</TableHead>
                <TableHead>Employment Status</TableHead>
                {canManage && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-8 ml-auto" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : employees && employees.length > 0 ? (
                employees.map((employee) => (
                  <TableRow key={employee.id} onClick={() => router.push(`/dashboard/employees/${employee.id}`)} className="cursor-pointer">
                    <TableCell className="font-mono">{employee.employeeCode}</TableCell>
                    <TableCell className="font-medium">
                      {`${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {employee.positionIds?.map(id => (
                          <Badge key={id} variant="secondary">{positionMap.get(id) || 'N/A'}</Badge>
                        )) || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline">{employee.assignmentStatus}</Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant={employee.employmentStatus === 'Active' ? 'default' : 'secondary'}>{employee.employmentStatus}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEmployee(employee);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              View Work History
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 6 : 5}
                    className="h-24 text-center"
                  >
                    No field employees found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && isFormOpen && (
        <EmployeeForm
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            employeeType="FIELD"
            employee={selectedEmployee}
            onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
