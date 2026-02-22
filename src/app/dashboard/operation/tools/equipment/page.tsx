
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Hammer, PlusCircle, MoreHorizontal, Search, ArrowRightLeft } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Tool } from '@/types/tool';
import ToolForm from '@/components/forms/tool-form';
import { useToast } from '@/hooks/use-toast';
import ToolStockManagerForm from '@/components/forms/tool-stock-manager-form';

export default function EquipmentPage() {
    const db = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [isStockManagerOpen, setIsStockManagerOpen] = useState(false);
    const [selectedToolForStock, setSelectedToolForStock] = useState<Tool | null>(null);

    const toolsQuery = useMemoFirebase(() => (db ? query(collection(db, 'tools'), orderBy('name')) : null), [db]);
    const { data: tools, isLoading, refetch } = useCollection<Tool>(toolsQuery);
    
    const filteredTools = useMemo(() => {
        if (!tools) return [];
        if (!searchTerm) return tools;
        return tools.filter(tool => 
            tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (tool.code && tool.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            tool.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tools, searchTerm]);
    
    const handleAddTool = () => {
        setSelectedTool(null);
        setIsFormOpen(true);
    };

    const handleEditTool = (tool: Tool) => {
        setSelectedTool(tool);
        setIsFormOpen(true);
    };
    
    const handleManageStock = (tool: Tool) => {
        setSelectedToolForStock(tool);
        setIsStockManagerOpen(true);
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Hammer /> อุปกรณ์และเครื่องมือ (Tools & Equipment)
            </h1>
            <p className="text-muted-foreground">
                จัดการรายการเครื่องมือ, จำนวน, และประวัติการเบิกจ่าย
            </p>
            </div>
            <Button onClick={handleAddTool}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Tool
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Tool Inventory</CardTitle>
                <div className="flex items-center justify-between">
                  <CardDescription>A list of all tools and equipment.</CardDescription>
                  <div className="relative w-full max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder="Search by name, code, or category..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                      />
                  </div>
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Tool Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Available</TableHead>
                            <TableHead>Assigned</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredTools.length > 0 ? (
                            filteredTools.map((tool) => (
                                <TableRow key={tool.id}>
                                    <TableCell className="font-mono text-xs">{tool.code}</TableCell>
                                    <TableCell className="font-medium">{tool.name}</TableCell>
                                    <TableCell>{tool.category}</TableCell>
                                    <TableCell>{tool.totalQuantity} {tool.unit}</TableCell>
                                    <TableCell className="font-bold text-green-600">{tool.availableQuantity} {tool.unit}</TableCell>
                                    <TableCell>{tool.assignedQuantity} {tool.unit}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleManageStock(tool)}>
                                                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                    Manage Stock
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditTool(tool)}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">No tools found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>

        {isFormOpen && (
            <ToolForm 
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                tool={selectedTool}
                onSuccess={refetch}
            />
        )}

        {isStockManagerOpen && (
             <ToolStockManagerForm
                open={isStockManagerOpen}
                onOpenChange={setIsStockManagerOpen}
                tool={selectedToolForStock}
                onSuccess={refetch}
            />
        )}
        </div>
    );
}
