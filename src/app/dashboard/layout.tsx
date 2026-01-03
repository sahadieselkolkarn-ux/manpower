import AuthGuard from "@/components/auth-guard";
import SidebarLayout from "@/components/sidebar-layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarLayout>{children}</SidebarLayout>
    </AuthGuard>
  );
}
