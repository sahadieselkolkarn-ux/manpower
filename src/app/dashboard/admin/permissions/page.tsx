'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, ShieldAlert, Download, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import FullPageLoader from '@/components/full-page-loader';
import { PERMISSION_MAP, PermissionKey } from '@/lib/rbac/permissions';
import { ROLES_SEED_DATA } from '@/lib/roles';
import { RoleCode } from '@/types/user';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Helper function for client-side file download
function downloadFile(filename: string, content: string, mimeType: string) {
  const element = document.createElement("a");
  const file = new Blob([content], { type: mimeType });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export default function AdminPermissionsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const standardRoleCodes = useMemo(() => ROLES_SEED_DATA.map(r => r.code), []);
  const permissionKeys = useMemo(() => Object.keys(PERMISSION_MAP) as PermissionKey[], []);
  
  const filteredPermissionKeys = useMemo(() => {
    if (!searchTerm) {
      return permissionKeys;
    }
    return permissionKeys.filter(key => key.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, permissionKeys]);

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(PERMISSION_MAP, null, 2);
    downloadFile('permissions.json', jsonContent, 'application/json');
  };

  const handleExportCSV = () => {
    let csvContent = `Permission,${standardRoleCodes.join(',')}\n`;
    permissionKeys.forEach(key => {
        const row = [key];
        standardRoleCodes.forEach(roleCode => {
            const hasPermission = PERMISSION_MAP[key].includes(roleCode);
            row.push(hasPermission ? 'TRUE' : 'FALSE');
        });
        csvContent += row.join(',') + '\n';
    });
    downloadFile('permissions.csv', csvContent, 'text/csv');
  };

  if (authLoading) {
    return <FullPageLoader />;
  }

  if (!userProfile?.isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="m-4 text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <ShieldAlert className="text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Permissions Matrix</h1>
          <p className="text-muted-foreground">Read-only view of role-based permissions in the system.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportJSON}><Download className="mr-2 h-4 w-4"/>Export JSON</Button>
            <Button variant="outline" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4"/>Export CSV</Button>
        </div>
      </div>

       <Card>
        <CardHeader>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 max-w-sm"
                />
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Permission Key</TableHead>
                  {standardRoleCodes.map(code => (
                    <TableHead key={code} className="text-center">{code.replace(/_/g, ' ')}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissionKeys.map(key => (
                  <TableRow key={key}>
                    <TableCell className="font-mono text-xs sticky left-0 bg-card">{key}</TableCell>
                    {standardRoleCodes.map(roleCode => (
                      <TableCell key={roleCode} className="text-center">
                        {PERMISSION_MAP[key].includes(roleCode) && <Check className="h-5 w-5 text-green-500 mx-auto" />}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
