
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { 
  LogOut, 
  Home, 
  Users, 
  Briefcase, 
  Ship, 
  UserCheck, 
  Award,
  FileText,
  DollarSign,
  Receipt,
  ShieldCheck,
  Database,
  FolderKanban,
  Clock,
  Landmark,
  ArrowRightLeft,
  LayoutDashboard,
  WalletCards,
  FileBox,
  Coins,
  GanttChartSquare,
  Library,
  ShoppingBag,
  Target,
  FileUp,
  Building,
  History,
  Hospital,
  Shield,
  UserCog,
  BookUser,
  CalendarDays,
  CalendarCheck,
  FileCog,
  Settings,
  AlertCircle,
  Banknote,
  Send,
  UserRoundCog,
  Timer
} from "lucide-react";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { Icons } from "./icons";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { type Role } from "@/types/user";
import { useRoles } from "@/context/RolesContext";
import { hasAnyRole, canManageHR } from "@/lib/authz";


export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const { rolesById, isLoading: isLoadingRoles } = useRoles();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push("/");
  };
  
  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  }
  
  // Hide sidebar for specific routes like the export page
  if (pathname.includes('/export')) {
    return <main>{children}</main>;
  }

  const isAdmin = userProfile?.isAdmin;

  const canViewOperation = hasAnyRole(userProfile, "OPERATION_MANAGER", "OPERATION_OFFICER");
  const canViewHR = canManageHR(userProfile);
  const canViewFinance = hasAnyRole(userProfile, "FINANCE_MANAGER", "FINANCE_OFFICER", "PAYROLL_OFFICER");
  
  const roleDisplayNames = React.useMemo(() => {
      if (isLoadingRoles || !userProfile?.roleIds) return 'Loading Roles...';
      if (isAdmin) return 'Administrator';
      return userProfile.roleCodes
        .map(code => code.replace(/_/g, ' '))
        .join(', ');
  }, [userProfile, rolesById, isLoadingRoles, isAdmin]);


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Icons.logo className="size-8" />
            <span className="text-xl font-headline">ManpowerFlow</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                <Link href="/dashboard">
                  <Home />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarSeparator />
            
            {canViewOperation && (
              <SidebarGroup>
                <SidebarGroupLabel>Operation</SidebarGroupLabel>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/clients")}>
                    <Link href="/dashboard/clients">
                      <Building />
                      <span>Customers (ลูกค้า)</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/contracts")}>
                    <Link href="/dashboard/contracts">
                      <FileText />
                      <span>Contracts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/projects")}>
                    <Link href="/dashboard/projects">
                      <FolderKanban />
                      <span>Projects</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/waves")}>
                    <Link href="/dashboard/waves">
                      <Ship />
                      <span>Waves</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/assignments")}>
                    <Link href="/dashboard/hr/assignments">
                      <UserCheck />
                      <span>Assignments</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroup>
            )}

            {canViewHR && (
              <SidebarGroup>
                <SidebarGroupLabel>HR &amp; Manpower</SidebarGroupLabel>
                 <Collapsible>
                    <CollapsibleTrigger asChild className="w-full">
                       <SidebarMenuButton isActive={pathname.startsWith("/dashboard/hr/employees")}>
                            <UserRoundCog />
                            <span>การจัดการบุคลากร</span>
                       </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/employees/office")}>
                                <Link href="/dashboard/hr/employees/office"><BookUser /><span>Office Employees</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/employees/field")}>
                                <Link href="/dashboard/hr/employees/field"><Users /><span>Manpower Employees</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/manpower-costing")}>
                                <Link href="/dashboard/hr/manpower-costing"><DollarSign /><span>ต้นทุน Manpower ในสัญญา</span></Link>
                            </SidebarMenuButton>
                         </SidebarMenuItem>
                    </CollapsibleContent>
                 </Collapsible>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/timesheets")}>
                    <Link href="/dashboard/hr/timesheets">
                      <Clock />
                      <span>Timesheets</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/attendance")}>
                    <Link href="/dashboard/hr/attendance">
                      <CalendarCheck />
                      <span>Attendance</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/pnd1")}>
                    <Link href="/dashboard/hr/pnd1">
                      <FileText />
                      <span>P.N.D.1 Runs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/tax-profiles")}>
                    <Link href="/dashboard/hr/tax-profiles">
                      <FileText />
                      <span>L.Y.01 Forms</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/compliance-alerts")}>
                    <Link href="/dashboard/hr/compliance-alerts">
                      <AlertCircle />
                      <span>Compliance Alerts</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <Collapsible>
                    <CollapsibleTrigger asChild className="w-full">
                       <SidebarMenuButton isActive={pathname.startsWith("/dashboard/hr/holidays") || pathname.startsWith("/dashboard/hr/policies") || pathname.startsWith("/dashboard/hr/master") || pathname.startsWith("/dashboard/hr/settings")}>
                            <Settings />
                            <span>HR Settings</span>
                       </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/holidays")}>
                                <Link href="/dashboard/hr/holidays"><CalendarDays /><span>Holidays</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/policies")}>
                                <Link href="/dashboard/hr/policies/attendance"><FileCog /><span>Policies</span></Link>
                            </SidebarMenuButton>
                         </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/settings/overtime")}>
                                <Link href="/dashboard/hr/settings/overtime"><Timer /><span>OT Settings</span></Link>
                            </SidebarMenuButton>
                         </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/master/office-positions")}>
                                <Link href="/dashboard/hr/master/office-positions"><BookUser /><span>Office Position</span></Link>
                            </SidebarMenuButton>
                         </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/master/manpower-positions")}>
                                <Link href="/dashboard/hr/master/manpower-positions"><Users /><span>Manpower Position (Master)</span></Link>
                            </SidebarMenuButton>
                         </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/master/certificate-types")}>
                                <Link href="/dashboard/admin/master/certificate-types"><Award /><span>Certificate Types</span></Link>
                            </SidebarMenuButton>
                         </SidebarMenuItem>
                         <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/hr/hospitals")}>
                                <Link href="/dashboard/hr/hospitals"><Hospital /><span>Hospitals</span></Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </CollapsibleContent>
                 </Collapsible>
              </SidebarGroup>
            )}

            {canViewFinance && (
                 <SidebarGroup>
                    <SidebarGroupLabel>Accounting</SidebarGroupLabel>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/finance/pending-billing")}>
                          <Link href="/dashboard/finance/pending-billing">
                              <FileUp />
                              <span>Pending Processing</span>
                          </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                     <Collapsible>
                        <CollapsibleTrigger asChild className="w-full">
                            <SidebarMenuButton isActive={pathname.startsWith("/dashboard/billing")}>
                                <Send /><span>Billing</span>
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-4">
                           <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/billing/runs")}>
                                    <Link href="/dashboard/billing/runs"><FileUp /><span>Billing Runs</span></Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/billing/invoices")}>
                                    <Link href="/dashboard/billing/invoices"><Receipt /><span>Invoices</span></Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </CollapsibleContent>
                     </Collapsible>

                      <Collapsible>
                        <CollapsibleTrigger asChild className="w-full">
                            <SidebarMenuButton isActive={pathname.startsWith("/dashboard/finance") && !pathname.startsWith("/dashboard/finance/pending-billing")}>
                                <Banknote /><span>Core Accounting</span>
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-4">
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/finance/ar")}>
                                    <Link href="/dashboard/finance/ar/invoices"><Receipt /><span>A/R</span></Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/finance/ap")}>
                                    <Link href="/dashboard/finance/ap/bills"><FileBox /><span>A/P</span></Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/finance/cash")}>
                                    <Link href="/dashboard/finance/cash/dashboard"><Landmark /><span>Cash</span></Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                             <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/finance/payroll")}>
                                    <Link href="/dashboard/finance/payroll"><Users /><span>Payroll</span></Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </CollapsibleContent>
                     </Collapsible>
                </SidebarGroup>
            )}

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/users")}>
                    <Link href="/dashboard/admin/users">
                      <UserCog />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/roles")}>
                    <Link href="/dashboard/admin/roles">
                      <Shield />
                      <span>Roles</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/permissions")}>
                    <Link href="/dashboard/admin/permissions">
                      <ShieldCheck />
                      <span>Permissions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarSeparator />
                 <Collapsible>
                    <CollapsibleTrigger asChild className="w-full">
                       <SidebarMenuButton isActive={pathname.startsWith("/dashboard/admin/system")}>
                              <Building />
                              <span>System</span>
                       </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/system/company-profile")}>
                                <Link href="/dashboard/admin/system/company-profile">
                                    <Building />
                                    <span>Company Profile</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/system/security")}>
                                <Link href="/dashboard/admin/system/security">
                                    <ShieldCheck />
                                    <span>Security</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </CollapsibleContent>
                 </Collapsible>
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/cooldown")}>
                    <Link href="/dashboard/admin/cooldown">
                      <ShieldCheck />
                      <span>Cooldown Policy</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/employee-history")}>
                    <Link href="/dashboard/admin/employee-history">
                      <History />
                      <span>Employee History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/admin/audit-logs")}>
                    <Link href="/dashboard/admin/audit-logs">
                      <Library />
                      <span>Audit Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarGroup>
            )}

          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-card border">
            <Avatar>
              <AvatarImage src={user?.photoURL ?? undefined} />
              <AvatarFallback>{userProfile ? getInitials(userProfile.email) : '...'}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold truncate">{userProfile?.displayName || userProfile?.email}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">{roleDisplayNames || 'No Roles'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="shrink-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
