
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { format, getMonth, getYear } from "date-fns";

import { useFirestore } from "@/firebase";
import { getStorage } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Employee, Ly01Profile, Ly01Audit } from "@/types/employee";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface Ly01FormProps {
  employee: Employee;
  mode: "hr" | "kiosk";
  onFormSubmit?: () => void;
}

const formSchema = z
  .object({
    maritalStatus: z
      .enum(["single", "married", "divorced", "widowed"])
      .optional(),
    spouseHasIncome: z.boolean().optional(),
    childrenCountTotal: z.coerce.number().min(0).optional(),
    childrenEligible30k: z.coerce.number().min(0).optional(),
    childrenEligible60k: z.coerce.number().min(0).optional(),
    // ... other fields
    lifeInsuranceAmount: z.coerce.number().min(0).optional(),
  })
  .refine(
    (data) => {
      if (
        data.childrenCountTotal !== undefined &&
        data.childrenEligible30k !== undefined &&
        data.childrenEligible60k !== undefined
      ) {
        return (
          data.childrenEligible30k + data.childrenEligible60k <=
          data.childrenCountTotal
        );
      }
      return true;
    },
    {
      message: "Sum of eligible children cannot exceed total children.",
      path: ["childrenEligible60k"],
    }
  );

export function Ly01Form({ employee, mode, onFormSubmit }: Ly01FormProps) {
  const db = useFirestore();
  const { userProfile } = useAuth(); // For HR mode
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: employee.taxProfile?.ly01?.data || {},
  });

  const handleFileSubmit = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: Ly01Audit["action"]
  ) => {
    // File upload logic here
  };

  const onSubmit = async (
    values: z.infer<typeof formSchema>,
    action: "SAVE_DRAFT" | "SUBMIT" | "VERIFY"
  ) => {
    if (!db) return;
    setLoading(true);

    const userDisplayName =
      mode === "hr"
        ? userProfile?.displayName || "HR"
        : employee.personalInfo.firstName;

    let newStatus: Ly01Profile["status"] = "DRAFT";
    if (action === "SUBMIT") newStatus = "SUBMITTED";
    if (action === "VERIFY") newStatus = "VERIFIED";

    const ly01Data: Partial<Ly01Profile> = {
      status: newStatus,
      updatedAt: serverTimestamp() as Timestamp,
      updatedBy: userDisplayName,
      data: values,
      audit: [
        ...(employee.taxProfile?.ly01?.audit || []),
        {
          action,
          at: serverTimestamp() as Timestamp,
          by: userDisplayName,
        },
      ],
    };

    if (action === "VERIFY") {
      ly01Data.verifiedAt = serverTimestamp() as Timestamp;
      ly01Data.verifiedBy = userDisplayName;
    }
    
    if (action === "SUBMIT" || (action === "SAVE_DRAFT" && employee.taxProfile?.ly01?.status === 'MISSING')) {
        ly01Data.status = action === "SUBMIT" ? "SUBMITTED" : "DRAFT";
    }

    try {
      const employeeRef = doc(db, "employees", employee.id);
      await updateDoc(employeeRef, {
        "taxProfile.ly01": ly01Data,
      });

      toast({
        title: "Success",
        description: `LY.01 profile has been ${action.toLowerCase()}.`,
      });
      onFormSubmit?.();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update tax profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Deduction Profile (LY.01)</CardTitle>
        <CardDescription>
          For Employee: {employee.personalInfo.firstName}{" "}
          {employee.personalInfo.lastName} ({employee.employeeCode})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-8">
            <FormField
              control={form.control}
              name="maritalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marital Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Add other form fields here... */}

            <Separator />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.handleSubmit((v) => onSubmit(v, "SAVE_DRAFT"))()}
                disabled={loading}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={() => form.handleSubmit((v) => onSubmit(v, "SUBMIT"))()}
                disabled={loading}
              >
                Submit
              </Button>
              {mode === "hr" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => form.handleSubmit((v) => onSubmit(v, "VERIFY"))()}
                  disabled={loading}
                >
                  Verify (HR)
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
