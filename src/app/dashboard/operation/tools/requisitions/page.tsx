
'use client';

import React, { useState, useMemo } from 'react';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Search, User, Wrench } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Employee } from '@/types/employee';
import { ManpowerPosition } from '@/types/position';
import { Tool } from '@/types/tool';
import { ToolAssignment } from '@/types/tool-assignment';
import { Badge } from '@/components/ui/badge';

export default function RequisitionsPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  // Data Fetching
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(
    useMemoFirebase(() => db ? query(collection(db, 'employees'), where('employeeType', '==', 'FIELD')) : null, [db])
  );
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(
    useMemoFirebase(() => db ? collection(db, 'manpowerPositions') : null, [db])
  );
  const { data: tools, isLoading: isLoadingTools } = useCollection<Tool>(
    useMemoFirebase(() => db ? collection(db, 'tools') : null, [db])
  );
  const { data: assignments, isLoading: isLoadingAssignments } = useCollection<ToolAssignment>(
    useMemoFirebase(() => db ? collection(db, 'toolAssignments') : null, [db])
  );

  // Data Memoization and Processing
  const positionMap = useMemo(() => new Map(positions?.map(p => [p.id, p])), [positions]);
  const toolMap = useMemo(() => new Map(tools?.map(t => [t.id, t])), [tools]);

  const assignmentsByEmployee = useMemo(() => {
    const map = new Map<string, ToolAssignment[]>();
    if (!assignments) return map;
    for (const assignment of assignments) {
      if (!map.has(assignment.employeeId)) {
        map.set(assignment.employeeId, []);
      }
      map.get(assignment.employeeId)!.push(assignment);
    }
    return map;
  }, [assignments]);
  
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    if (!searchTerm) return employees;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return employees.filter(emp => 
        emp.employeeCode.toLowerCase().includes(lowerSearchTerm) ||
        `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`.toLowerCase().includes(lowerSearchTerm)
    );
  }, [employees, searchTerm]);
  
  const isLoading = isLoadingEmployees || isLoadingPositions || isLoadingTools || isLoadingAssignments;
  
  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-8 w-3/4" />
            <Card><CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ClipboardList /> จัดการการเบิก (Requisitions)
          </h1>
          <p className="text-muted-foreground">
            ดูภาพรวมการเบิกจ่ายเครื่องมือและอุปกรณ์ของพนักงานแต่ละคน
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
             <div className="flex items-center justify-between">
                  <CardTitle>Employee Requisitions</CardTitle>
                  <div className="relative w-full max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder="Search employee by name or code..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                      />
                  </div>
                </div>
        </CardHeader>
        <CardContent>
            {filteredEmployees.length === 0 ? (
                 <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <User className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No Employees Found</h3>
                    <p className="mt-1 text-sm text-gray-500">No manpower employees match the current search criteria.</p>
                </div>
            ) : (
                <Accordion type="single" collapsible className="w-full">
                    {filteredEmployees.map(employee => {
                        const employeeAssignments = assignmentsByEmployee.get(employee.id) || [];
                        const checkedOutTools = new Map<string, number>();
                        
                        employeeAssignments.forEach(a => {
                            const currentQty = checkedOutTools.get(a.toolId) || 0;
                            if (a.transactionType === 'RETURN') {
                                checkedOutTools.set(a.toolId, currentQty - a.quantity);
                            } else { // CHECKOUT
                                checkedOutTools.set(a.toolId, currentQty + a.quantity);
                            }
                        });

                        const requiredTools: Tool[] = [];
                        employee.positionIds?.forEach(posId => {
                            const position = positionMap.get(posId);
                            position?.requiredToolIds?.forEach(toolId => {
                                const tool = toolMap.get(toolId);
                                if (tool && !requiredTools.some(t => t.id === tool.id)) {
                                    requiredTools.push(tool);
                                }
                            });
                        });

                        return (
                            <AccordionItem value={employee.id} key={employee.id}>
                                <AccordionTrigger>
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">{employee.personalInfo.firstName} {employee.personalInfo.lastName}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{employee.employeeCode}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {requiredTools.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center p-4">No tools required for this employee's assigned positions.</p>
                                    ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tool</TableHead>
                                                <TableHead>Required for Position</TableHead>
                                                <TableHead className="text-right">Quantity Checked Out</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {requiredTools.map(tool => (
                                                <TableRow key={tool.id}>
                                                    <TableCell className="font-medium">{tool.name} <span className="font-mono text-xs text-muted-foreground">({tool.code})</span></TableCell>
                                                    <TableCell>
                                                      <div className="flex flex-wrap gap-1">
                                                        {employee.positionIds?.map(posId => {
                                                          const pos = positionMap.get(posId);
                                                          if (pos?.requiredToolIds?.includes(tool.id)) {
                                                            return <Badge key={pos.id} variant="outline">{pos.name}</Badge>
                                                          }
                                                          return null;
                                                        })}
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold font-mono">
                                                        {checkedOutTools.get(tool.id) || 0} / {tool.unit}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    