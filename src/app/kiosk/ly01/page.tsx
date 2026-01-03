
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, getDocs, query, where } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Employee } from "@/types/employee";
import { Ly01Form } from "@/components/tax/Ly01Form";

const searchSchema = z.object({
  searchTerm: z.string().min(1, "Please enter your employee code or name."),
  verification: z.string().length(4, "Please enter the last 4 digits."),
});

export default function KioskLy01Page() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { searchTerm: "", verification: "" },
  });

  const handleSearch = async (values: z.infer<typeof searchSchema>) => {
    if (!db) return;
    setLoading(true);

    try {
      const searchTermLower = values.searchTerm.toLowerCase();
      // This is not efficient for large datasets, but works for a demo.
      // A real implementation would use a dedicated search service.
      const employeesRef = collection(db, "employees");
      const q = query(employeesRef);
      const querySnapshot = await getDocs(q);

      let foundEmployee: Employee | null = null;
      querySnapshot.forEach((doc) => {
        const emp = { id: doc.id, ...doc.data() } as Employee;
        const fullName =
          `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`.toLowerCase();
        if (
          emp.employeeCode.toLowerCase() === searchTermLower ||
          fullName.includes(searchTermLower)
        ) {
          // Verification check
          const nationalIdLast4 = emp.personalInfo.nationalId
            ?.replace(/\D/g, "")
            .slice(-4);
          const phoneLast4 = emp.contactInfo.phone
            ?.replace(/\D/g, "")
            .slice(-4);
          if (
            values.verification === nationalIdLast4 ||
            values.verification === phoneLast4
          ) {
            foundEmployee = emp;
          }
        }
      });

      if (foundEmployee) {
        setEmployee(foundEmployee);
      } else {
        toast({
          variant: "destructive",
          title: "Not Found",
          description:
            "Employee not found or verification failed. Please check your details.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while searching.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setEmployee(null);
    form.reset();
  };
  
  if (employee) {
    return (
        <div className="p-4 md:p-8">
            <Button onClick={handleBackToSearch} variant="link" className="mb-4">
                &larr; Back to search
            </Button>
            <Ly01Form employee={employee} mode="kiosk" onFormSubmit={handleBackToSearch}/>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Employee Tax Profile (LY.01)</CardTitle>
          <CardDescription>
            Please enter your employee code and the last 4 digits of your ID or
            phone number to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSearch)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="searchTerm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Code or Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., EMP-0001 or John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="verification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Last 4 Digits of National ID or Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Searching..." : "Find My Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
