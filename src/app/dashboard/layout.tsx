import AuthGuard from "@/components/auth-guard";
import SidebarLayout from "@/components/sidebar-layout";
import { RolesProvider } from "@/context/RolesContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RolesProvider>
        <SidebarLayout>{children}</SidebarLayout>
      </RolesProvider>
    </AuthGuard>
  );
}
