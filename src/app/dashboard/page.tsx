
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Activity, Users, Ship, Briefcase, FolderKanban, Download } from "lucide-react";
import Link from "next/link";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collectionGroup } from "firebase/firestore";
import { type WaveWithProject } from "@/types/wave";
import { type ProjectWithContract } from "@/types/project";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const db = useFirestore();

  const wavesQuery = useMemoFirebase(() => db ? collectionGroup(db, 'waves') : null, [db]);
  const { data: waves, isLoading: isLoadingWaves } = useCollection<WaveWithProject>(wavesQuery);
  
  const projectsQuery = useMemoFirebase(() => db ? collectionGroup(db, 'projects') : null, [db]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<ProjectWithContract>(projectsQuery);

  const isLoading = isLoadingWaves || isLoadingProjects;

  const getWavePath = (wave: WaveWithProject) => {
    if (!wave.clientId || !wave.contractId || !wave.projectId) return '#';
    return `/dashboard/clients/${wave.clientId}/contracts/${wave.contractId}/projects/${wave.projectId}/waves/${wave.id}`;
  };
  
  const assignedManpower = waves?.reduce((total, wave) => {
    // This is a placeholder logic. A real implementation would query assignments subcollection.
    return total;
  }, 0) || 0;

  const stats = [
    { title: "Active Waves", value: waves?.length ?? 0, icon: Ship, color: "text-primary" },
    { title: "Assigned Manpower", value: "N/A", icon: Users, color: "text-green-500" },
    { title: "Projects Underway", value: projects?.length ?? 0, icon: FolderKanban, color: "text-amber-500" },
    { title: "Upcoming Expirations", value: "N/A", icon: Briefcase, color: "text-red-500" },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Welcome, {userProfile?.displayName || userProfile?.email}!
          </h1>
        </div>
      </div>
      <p className="text-muted-foreground">
        Here's a quick overview of your manpower operations.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stat.value}</div>}
              <p className="text-xs text-muted-foreground">Data from live system</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight font-headline">Active Waves</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {isLoading ? (
                Array.from({length: 4}).map((_, i) => (
                    <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-full" /></CardContent></Card>
                ))
            ) : waves && waves.length > 0 ? (
                waves.slice(0, 4).map((wave) => ( // Show only top 4 for dashboard
                    <Card key={wave.id} className="shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{wave.name}</span>
                                <Link href={getWavePath(wave)} className="text-sm font-medium text-primary hover:underline">View Details</Link>
                            </CardTitle>
                            <CardDescription>{wave.projectName || "Loading..."}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">N/A Assigned</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(wave.planningWorkPeriod.startDate.seconds * 1000).toLocaleDateString()} - {new Date(wave.planningWorkPeriod.endDate.seconds * 1000).toLocaleDateString()}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                 <Card>
                    <CardContent className="h-24 flex items-center justify-center text-muted-foreground">
                        No active waves found.
                    </CardContent>
                 </Card>
            )}
          </div>
      </div>
    </div>
  );
}
