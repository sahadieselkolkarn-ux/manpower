
"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
  query,
  where,
  getDocs,
  collectionGroup,
  getDoc,
} from "firebase/firestore";
import { format, parse, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Trash2 } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { type Wave, WaveWithProject, ManpowerRequirement } from "@/types/wave";
import { type ManpowerPosition } from "@/types/position";
import { ProjectWithContract, Project } from "@/types/project";
import { toDate, DATE_FORMAT } from "@/lib/utils";
import { Contract } from "@/types/contract";
import { Client } from "@/types/client";
import { CertificateType } from "@/types/certificate-type";
import { Checkbox } from "../ui/checkbox";
import { MultiSelect } from "../ui/multi-select";

const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' && arg) {
    try {
      const parsedDate = parse(arg, DATE_FORMAT, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    } catch (e) {
      // Let Zod handle the error
    }
  }
  return arg;
}, z.date({
    invalid_type_error: `Invalid date. Please use the format ${DATE_FORMAT}.`,
    required_error: "Date is required."
}));


const manpowerRequirementSchema = z.object({
  positionId: z.string().min(1, "Position is required."),
  count: z.coerce.number().int().min(1, "Count must be at least 1."),
  requiredCertificateIds: z.array(z.string()).optional(),
  requiredSkillTags: z.string().optional(), // Keep as string for form input
});

const formSchema = z.object({
  waveCode: z.string().min(1, "Wave code is required."),
  projectId: z.string().min(1, "Project is required."),
  planningWorkPeriod: z.object({
    startDate: dateSchema,
    endDate: dateSchema,
  }),
  manpowerRequirement: z.array(manpowerRequirementSchema).min(1, "At least one manpower requirement is needed."),
}).refine(data => {
    if (data.planningWorkPeriod.startDate && data.planningWorkPeriod.endDate) {
        return data.planningWorkPeriod.endDate >= data.planningWorkPeriod.startDate;
    }
    return true;
}, {
    message: "End date must be after or the same as start date.",
    path: ["planningWorkPeriod", "endDate"],
});


type WaveFormData = z.infer<typeof formSchema>;

interface WaveFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wave?: WaveWithProject | null;
  projects?: ProjectWithContract[];
  onSuccess?: () => void;
  routeParams?: {
    clientId: string;
    contractId: string;
    projectId: string;
  };
}

export default function WaveForm({
  open,
  onOpenChange,
  wave,
  projects = [],
  onSuccess,
  routeParams,
}: WaveFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const positionsQuery = useMemoFirebase(() => (db ? collection(db, "manpowerPositions") : null), [db]);
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(positionsQuery);

  const certificateTypesQuery = useMemoFirebase(() => (db ? collection(db, "certificateTypes") : null), [db]);
  const { data: certificateTypes, isLoading: isLoadingCertTypes } = useCollection<CertificateType>(certificateTypesQuery);

  const form = useForm<WaveFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      waveCode: "",
      projectId: routeParams?.projectId || "",
      manpowerRequirement: [{ positionId: "", count: 1, requiredCertificateIds: [], requiredSkillTags: '' }],
      planningWorkPeriod: {
          startDate: undefined,
          endDate: undefined
      }
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "manpowerRequirement",
  });
  
  const certificateOptions = useMemo(() => {
    if (!certificateTypes) return [];
    return certificateTypes.map(ct => ({ label: ct.name, value: ct.id }));
  }, [certificateTypes]);

  useEffect(() => {
    if (open) {
      if (wave) {
        let requirements: any[] = [];
        if (Array.isArray(wave.manpowerRequirement)) {
            requirements = wave.manpowerRequirement.map(
              (req) => ({ 
                positionId: req.positionId, 
                count: req.count,
                requiredCertificateIds: req.requiredCertificateIds || [],
                requiredSkillTags: req.requiredSkillTags?.join(', ') || ''
              })
            );
        }

        const startDate = toDate(wave.planningWorkPeriod.startDate);
        const endDate = toDate(wave.planningWorkPeriod.endDate);

        form.reset({
          waveCode: wave.waveCode,
          projectId: wave.projectId,
          planningWorkPeriod: {
            startDate: startDate,
            endDate: endDate,
          },
          manpowerRequirement: requirements.length > 0 ? requirements : [{ positionId: "", count: 1, requiredCertificateIds: [], requiredSkillTags: '' }],
        });
      } else {
        form.reset({
          waveCode: "",
          projectId: routeParams?.projectId || "",
          planningWorkPeriod: {
            startDate: undefined,
            endDate: undefined
          },
          manpowerRequirement: [{ positionId: "", count: 1, requiredCertificateIds: [], requiredSkillTags: '' }],
        });
      }
    }
  }, [open, wave, form, routeParams]);

  const onSubmit = async (values: WaveFormData) => {
    if (!userProfile || !db) return;
    setLoading(true);

    try {
        const projectsSnapshot = await getDocs(collectionGroup(db, 'projects'));
        let isDuplicate = false;
        for (const projectDoc of projectsSnapshot.docs) {
            const waveCollectionRef = collection(projectDoc.ref, 'waves');
            const q = query(waveCollectionRef, where('waveCode', '==', values.waveCode));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                if (wave && querySnapshot.docs[0].id === wave.id) {
                    continue;
                }
                isDuplicate = true;
                break;
            }
        }

        if (isDuplicate) {
            form.setError('waveCode', { message: 'Wave code is already in use.' });
            setLoading(false);
            return;
        }

      const manpowerRequirementObject = values.manpowerRequirement.map(
        (item) => {
          return {
            positionId: item.positionId,
            count: item.count,
            requiredCertificateIds: item.requiredCertificateIds || [],
            requiredSkillTags: item.requiredSkillTags ? item.requiredSkillTags.split(',').map(s => s.trim()).filter(Boolean) : [],
          };
        }
      );
      
       let finalRouteParams: { clientId: string, contractId: string, projectId: string };

        if (routeParams) {
            finalRouteParams = routeParams;
        } else if (wave) {
             finalRouteParams = {
                clientId: wave.clientId,
                contractId: wave.contractId,
                projectId: wave.projectId,
            };
        } else {
             const allProjectsSnapshot = await getDocs(collectionGroup(db, 'projects'));
             let projectDocSnap;
             for (const doc of allProjectsSnapshot.docs) {
                 if (doc.id === values.projectId) {
                     projectDocSnap = doc;
                     break;
                 }
             }

            if (!projectDocSnap || !projectDocSnap.exists()) {
                throw new Error("Project details not found to save the wave.");
            }
            
            const pathSegments = projectDocSnap.ref.path.split('/');
            if(pathSegments.length < 6) {
                 throw new Error("Could not determine client/contract path for the project.");
            }
              finalRouteParams = {
                  clientId: pathSegments[1],
                  contractId: pathSegments[3],
                  projectId: pathSegments[5]
              };
        }


      const dataToSave: any = {
        waveCode: values.waveCode,
        planningWorkPeriod: {
          startDate: Timestamp.fromDate(values.planningWorkPeriod.startDate),
          endDate: Timestamp.fromDate(values.planningWorkPeriod.endDate),
        },
        manpowerRequirement: manpowerRequirementObject,
        updatedAt: serverTimestamp(),
      };
      
      const waveCollectionPath = `clients/${finalRouteParams.clientId}/contracts/${finalRouteParams.contractId}/projects/${finalRouteParams.projectId}/waves`;

      if (wave) {
        const waveRef = doc(db, waveCollectionPath, wave.id);
        await updateDoc(waveRef, {
            ...dataToSave,
        });
        toast({ title: "Success", description: "Wave updated successfully." });
      } else {
        await addDoc(collection(db, waveCollectionPath), {
          ...dataToSave,
          status: 'planned',
          createdAt: serverTimestamp(),
          createdBy: userProfile.displayName || userProfile.email,
        });
        toast({ title: "Success", description: "Wave created successfully." });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving wave:", error);
      const errorMessage = error instanceof Error ? error.message : "There was a problem saving the wave data.";
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{wave ? "Edit Wave" : "Add New Wave"}</DialogTitle>
          <DialogDescription>
            Define the details for this work period.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 max-h-[70vh] overflow-y-auto p-1"
          >
            <FormField
              control={form.control}
              name="waveCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wave Code (Unique)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CHEV-OCT24-SHUTDOWN" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {projects.length > 0 && (
                <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!!wave || !!routeParams?.projectId}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.clientName})</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}

            <div className="space-y-2">
                <FormLabel>Planning Work Period</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="planningWorkPeriod.startDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-normal text-muted-foreground">Start Date</FormLabel>
                                <FormControl>
                                <Input
                                  placeholder={DATE_FORMAT}
                                  {...field}
                                  value={field.value ? format(field.value, DATE_FORMAT) : ''}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="planningWorkPeriod.endDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-normal text-muted-foreground">End Date</FormLabel>
                                <FormControl>
                                <Input
                                  placeholder={DATE_FORMAT}
                                  {...field}
                                  value={field.value ? format(field.value, DATE_FORMAT) : ''}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormMessage>{form.formState.errors.planningWorkPeriod?.endDate?.message || form.formState.errors.planningWorkPeriod?.root?.message}</FormMessage>
            </div>

            <div className="space-y-4">
              <FormLabel>Manpower Requirement</FormLabel>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-4 border p-4 rounded-md relative"
                >
                   <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 h-6 w-6"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  <div className="grid grid-cols-3 gap-4">
                     <FormField
                        control={form.control}
                        name={`manpowerRequirement.${index}.positionId`}
                        render={({ field }) => (
                        <FormItem className="col-span-2">
                            <FormLabel>Position (ลูกจ้าง)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select position..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {isLoadingPositions ? <SelectItem value="loading" disabled>Loading...</SelectItem> : positions?.map((pos) => (
                                <SelectItem key={pos.id} value={pos.id}>
                                    {pos.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`manpowerRequirement.${index}.count`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Count</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="Count" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>
                   <FormField
                        control={form.control}
                        name={`manpowerRequirement.${index}.requiredCertificateIds`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Required Certificates (Optional)</FormLabel>
                            <MultiSelect
                                options={certificateOptions}
                                selected={field.value || []}
                                onChange={field.onChange}
                                placeholder="Select certificates..."
                                disabled={isLoadingCertTypes}
                            />
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name={`manpowerRequirement.${index}.requiredSkillTags`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Required Skills (Optional)</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g. 6G, TIG, English" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ positionId: "", count: 1, requiredCertificateIds: [], requiredSkillTags: '' })}
              >
                Add Requirement
              </Button>
              <FormMessage>{form.formState.errors.manpowerRequirement?.message || form.formState.errors.manpowerRequirement?.root?.message}</FormMessage>
            </div>

            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Wave"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
