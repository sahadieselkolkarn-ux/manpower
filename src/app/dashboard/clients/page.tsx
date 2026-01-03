"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { collection } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { type Client } from "@/types/client";
import { useAuth } from "@/context/AuthContext";
import ClientForm from "@/components/forms/client-form";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function ClientPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const db = useFirestore();
  const { userProfile } = useAuth();
  
  const clientsQuery = useMemoFirebase(() => db ? collection(db, 'clients') : null, [db]);
  const { data: clients, isLoading } = useCollection<Omit<Client, 'id'>>(clientsQuery);
  
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };
  
  const isAdmin = userProfile?.role === 'admin';


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Clients
        </h1>
        {isAdmin && (
          <Button onClick={handleAddClient}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Client
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Manage your clients and their contracts.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
          <CardDescription>
            A list of all clients in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Short Name</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    {isAdmin && <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : clients && clients.length > 0 ? (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                       <Link href={`/dashboard/clients/${client.id}`} className="hover:underline text-primary">
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.shortName}</TableCell>
                    <TableCell>{client.createdBy}</TableCell>
                    <TableCell>
                      {client.createdAt?.toDate().toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem>
                             <Link href={`/dashboard/clients/${client.id}`} className="w-full h-full">
                                View Details
                              </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            Edit
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
                  <TableCell colSpan={isAdmin ? 5: 4} className="h-24 text-center">
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {isAdmin && (
        <ClientForm 
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          client={selectedClient}
        />
      )}
    </div>
  );
}
