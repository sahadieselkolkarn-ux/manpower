
"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  runTransaction,
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
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { type Wave, WaveWithProject, ManpowerRequirement } from "@/types/wave";
import { type ManpowerPosition } from "@/types/position";
import { ProjectWithContract, Project } from "@/types/project";
import { toDate, DATE_FORMAT, formatDate } from "@/lib/utils";
import { CertificateType } from "@/types/certificate-type";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { type Contract, type ContractSaleRate } from "@/types/contract";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Tool } from "@/types/tool";


const dateStringSchema = z.string().refine(val => val ? isValid(parse(val, DATE_FORMAT, new Date())) : false, {
    message: `Invalid date format. Please use ${DATE_FORMAT}.`
});


const manpowerRequirementSchema = z.object({
  positionId: z.string().min(1, "Position is required."),
  positionName: z.string().optional(),
  count: z.coerce.number().int().min(1, "Count must be at least 1."),
  requiredCertificateIds: z.array(z.string()).optional(),
  requiredToolIds: z.array(z.string()).optional(),
  requiredSkillTags: z.string().optional(),
});

const formSchema = z.object({
  projectId: z.string().min(1, "Project is required."),
  planningWorkPeriod: z.object({
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  }),
  manpowerRequirement: z.array(manpowerRequirementSchema).min(1, "At least one manpower requirement is needed."),
}).refine(data => {
    const start = parse(data.planningWorkPeriod.startDate, DATE_FORMAT, new Date());
    const end = parse(data.planningWorkPeriod.endDate, DATE_FORMAT, new Date());
    if (isValid(start) && isValid(end)) {
        return end >= start;
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

const getSellRateExVat = (rate: ContractSaleRate, workMode: 'Onshore' | 'Offshore') => {
    if (workMode === 'Onshore') {
        return rate.onshoreSellDailyRateExVat ?? rate.dailyRateExVat ?? 0;
    }
    return rate.offshoreSellDailyRateExVat ?? rate.dailyRateExVat ?? 0;
};


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

  const positionsQuery = useMemoFirebase(() => (db ? query(collection(db, "manpowerPositions")) : null), [db]);
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(positionsQuery);

  const certificateTypesQuery = useMemoFirebase(() => (db ? query(collection(db, "certificateTypes")) : null), [db]);
  const { data: certificateTypes, isLoading: isLoadingCertTypes } = useCollection<CertificateType>(certificateTypesQuery);

  const { data: tools, isLoading: isLoadingTools } = useCollection<Tool>(useMemoFirebase(() => (db ? collection(db, 'tools') : null), [db]));

  const form = useForm<WaveFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectId: routeParams?.projectId || "",
      manpowerRequirement: [{ positionId: "", positionName: "", count: 1, requiredCertificateIds: [], requiredToolIds: [], requiredSkillTags: '' }],
      planningWorkPeriod: {
          startDate: format(new Date(), DATE_FORMAT),
          endDate: format(new Date(), DATE_FORMAT)
      }
    },
  });
  
  const selectedProjectId = form.watch('projectId');
  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const contractRef = useMemoFirebase(() => {
    if (!db || !selectedProject) return null;
    return doc(db, 'clients', selectedProject.clientId, 'contracts', selectedProject.contractId);
  }, [db, selectedProject]);
  
  const { data: contract, isLoading: isLoadingContract } = useDoc<Contract>(contractRef);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "manpowerRequirement",
  });
  
  const certificateOptions = useMemo(() => {
    if (!certificateTypes) return [];
    // Waves are for manpower, so filter for FIELD or GENERAL certificates.
    return certificateTypes
      .filter(ct => ct.type === 'FIELD' || ct.type === 'GENERAL')
      .map(ct => ({ label: ct.name, value: ct.id }));
  }, [certificateTypes]);

  const toolOptions = useMemo(() => {
    if (!tools) return [];
    return tools.map(t => ({ label: `${t.name} (${t.code})`, value: t.id }));
  }, [tools]);
  
  const positionMap = useMemo(() => new Map(positions?.map(p => [p.id, p.name])), [positions]);
  
  const allowedPositionIds = useMemo(() => {
    if (!contract || !selectedProject) return new Set<string>();
    return new Set(
        (contract.saleRates || [])
        .filter(rate => getSellRateExVat(rate, selectedProject.workMode) > 0)
        .map(rate => rate.positionId)
    );
  }, [contract, selectedProject]);

  const filteredPositions = useMemo(() => {
    if (!positions) return [];
    if (!contract || !selectedProject) return [];
    return positions.filter(p => allowedPositionIds.has(p.id));
  }, [positions, allowedPositionIds, contract, selectedProject]);


  useEffect(() => {
    if (open) {
      if (wave) {
        let requirements: any[] = [];
        if (Array.isArray(wave.manpowerRequirement)) {
            requirements = wave.manpowerRequirement.map(
              (req) => ({ 
                positionId: req.positionId, 
                positionName: req.positionName || positionMap.get(req.positionId) || 'Unknown',
                count: req.count,
                requiredCertificateIds: req.requiredCertificateIds || [],
                requiredToolIds: req.requiredToolIds || [],
                requiredSkillTags: req.requiredSkillTags?.join(', ') || ''
              })
            );
        }

        const startDate = toDate(wave.planningWorkPeriod.startDate);
        const endDate = toDate(wave.planningWorkPeriod.endDate);

        form.reset({
          projectId: wave.projectId,
          planningWorkPeriod: {
            startDate: startDate ? formatDate(startDate) : format(new Date(), DATE_FORMAT),
            endDate: endDate ? formatDate(endDate) : format(new Date(), DATE_FORMAT),
          },
          manpowerRequirement: requirements.length > 0 ? requirements : [{ positionId: "", positionName: "", count: 1, requiredCertificateIds: [], requiredToolIds: [], requiredSkillTags: '' }],
        });
      } else {
        form.reset({
          projectId: routeParams?.projectId || "",
          planningWorkPeriod: {
            startDate: format(new Date(), DATE_FORMAT),
            endDate: format(new Date(), DATE_FORMAT)
          },
          manpowerRequirement: [{ positionId: "", positionName: "", count: 1, requiredCertificateIds: [], requiredToolIds: [], requiredSkillTags: '' }],
        });
      }
    }
  }, [open, wave, form, routeParams, positionMap]);

  const onSubmit = async (values: WaveFormData) => {
    if (!userProfile || !db || !contract) {
        toast({ variant: "destructive", title: "Error", description: "Contract data is not loaded yet." });
        return;
    }
    
    // Final validation before submitting
    for (const req of values.manpowerRequirement) {
        if (!allowedPositionIds.has(req.positionId)) {
            const posName = positionMap.get(req.positionId) || req.positionId;
            toast({ variant: "destructive", title: "Invalid Position", description: `Position "${posName}" does not have a valid sale rate (> 0) in the contract for this work mode.` });
            return;
        }
    }


    setLoading(true);

    try {
        let finalRouteParams: { clientId: string, contractId: string, projectId: string };
        if (routeParams) finalRouteParams = routeParams;
        else if (wave) finalRouteParams = { clientId: wave.clientId, contractId: wave.contractId, projectId: wave.projectId };
        else {
             const proj = projects.find(p => p.id === values.projectId);
             if (!proj) throw new Error("Project details not found.");
             finalRouteParams = { clientId: proj.clientId, contractId: proj.contractId, projectId: proj.id };
        }

        const manpowerRequirementObject = values.manpowerRequirement.map(item => ({
            positionId: item.positionId,
            positionName: positionMap.get(item.positionId) || item.positionName,
            count: item.count,
            requiredCertificateIds: item.requiredCertificateIds || [],
            requiredToolIds: item.requiredToolIds || [],
            requiredSkillTags: item.requiredSkillTags ? item.requiredSkillTags.split(',').map(s => s.trim()).filter(Boolean) : [],
        }));

        const startDate = parse(values.planningWorkPeriod.startDate, DATE_FORMAT, new Date());
        const endDate = parse(values.planningWorkPeriod.endDate, DATE_FORMAT, new Date());

        if (wave) { // --- Update ---
            const waveCollectionPath = `clients/${finalRouteParams.clientId}/contracts/${finalRouteParams.contractId}/projects/${finalRouteParams.projectId}/waves`;
            const waveRef = doc(db, waveCollectionPath, wave.id);
            await updateDoc(waveRef, {
                planningWorkPeriod: { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) },
                manpowerRequirement: manpowerRequirementObject,
                updatedAt: serverTimestamp(),
            });
            toast({ title: "Success", description: "Wave updated successfully." });
        } else { // --- Create ---
            await runTransaction(db, async (transaction) => {
                const now = new Date();
                const beYear = now.getFullYear() + 543;
                const yy = String(beYear).slice(-2);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const YYMM = `${yy}${mm}`;

                const counterRef = doc(db, 'counters', `waveCodes_${YYMM}`);
                const counterDoc = await transaction.get(counterRef);
                const seq = counterDoc.data()?.next ?? 1;
                const waveCode = `WV-${YYMM}-${String(seq).padStart(3, '0')}`;
                
                const codeUniqueRef = doc(db, 'unique', `waveCodes__${waveCode}`);
                const codeUniqueDoc = await transaction.get(codeUniqueRef);
                if(codeUniqueDoc.exists()) {
                    throw new Error(`Generated wave code ${waveCode} already exists. Please try again.`);
                }
                
                const waveCollectionPath = `clients/${finalRouteParams.clientId}/contracts/${finalRouteParams.contractId}/projects/${finalRouteParams.projectId}/waves`;
                const newWaveRef = doc(collection(db, waveCollectionPath));

                transaction.set(newWaveRef, {
                    waveCode,
                    planningWorkPeriod: { startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate) },
                    manpowerRequirement: manpowerRequirementObject,
                    status: 'planned',
                    isDeleted: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: userProfile.displayName || userProfile.email,
                });
                
                transaction.set(codeUniqueRef, { entityId: newWaveRef.id });
                transaction.set(counterRef, { next: seq + 1 }, { merge: true });
            });
            toast({ title: "Success", description: "Wave created successfully with auto-generated code." });
        }
      
      onSuccess?.();
      onOpenChange(false);

    } catch (error) {
      console.error("Error saving wave:", error);
      const errorMessage = error instanceof Error ? error.message : "There was a problem saving the wave data.";
      toast({ variant: "destructive", title: "Uh oh! Something went wrong.", description: errorMessage });
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
            {wave ? (
                <FormItem>
                    <FormLabel>Wave Code (Unique)</FormLabel>
                    <FormControl>
                        <Input value={wave.waveCode} readOnly disabled />
                    </FormControl>
                </FormItem>
            ) : (
                 <FormItem>
                    <FormLabel>Wave Code (Unique)</FormLabel>
                    <FormControl>
                        <Input value="Auto-generated on save" readOnly disabled />
                    </FormControl>
                </FormItem>
            )}
            
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
              {!selectedProject || isLoadingContract ? (
                  <Alert variant="default">
                    <AlertTitle>Select a Project</AlertTitle>
                    <AlertDescription>Please select a project to see available positions based on the contract.</AlertDescription>
                  </Alert>
              ) : filteredPositions.length === 0 ? (
                 <Alert variant="destructive">
                    <AlertTitle>No Billable Positions Found</AlertTitle>
                    <AlertDescription>
                        There are no manpower positions with a valid sale rate (&gt; 0) in the contract for this project's work mode ({selectedProject?.workMode}).
                        Please update the contract first.
                    </AlertDescription>
                  </Alert>
              ) : (
                fields.map((field, index) => (
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
                                  <SelectValue placeholder="Select billable position..." />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {filteredPositions.map((pos) => (
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
                          <ScrollArea className="h-32 rounded-md border">
                            <div className="p-4 space-y-2">
                              {isLoadingCertTypes ? <p>Loading...</p> : certificateOptions.map((option) => (
                                <FormItem key={option.value} className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option.value)}
                                      onCheckedChange={(checked) => {
                                        const updatedValue = checked
                                          ? [...(field.value || []), option.value]
                                          : (field.value || []).filter((value) => value !== option.value);
                                        field.onChange(updatedValue);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{option.label}</FormLabel>
                                </FormItem>
                              ))}
                            </div>
                          </ScrollArea>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`manpowerRequirement.${index}.requiredToolIds`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Required Tools (Optional)</FormLabel>
                          <ScrollArea className="h-32 rounded-md border">
                            <div className="p-4 space-y-2">
                              {isLoadingTools ? <p>Loading...</p> : toolOptions.map((option) => (
                                <FormItem key={option.value} className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option.value)}
                                      onCheckedChange={(checked) => {
                                        const updatedValue = checked
                                          ? [...(field.value || []), option.value]
                                          : (field.value || []).filter((value) => value !== option.value);
                                        field.onChange(updatedValue);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{option.label}</FormLabel>
                                </FormItem>
                              ))}
                            </div>
                          </ScrollArea>
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
                ))
              )}
              
              {selectedProject && filteredPositions.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ positionId: "", positionName: "", count: 1, requiredCertificateIds: [], requiredToolIds: [], requiredSkillTags: '' })}
                >
                  Add Requirement
                </Button>
              )}
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
