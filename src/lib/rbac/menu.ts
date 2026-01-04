// src/lib/rbac/menu.ts
import { UserProfile } from "@/types/user";
import { hasPermission } from "./permissions";

interface MenuItem {
  label: string;
  href: string;
  allowed: (user: UserProfile) => boolean;
}

const ALL_MENU_ITEMS: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    allowed: () => true, // All logged in users can see the dashboard
  },
  {
    label: "Admin: Health",
    href: "/admin/health",
    allowed: (user) => hasPermission(user, 'ADMIN_ACCESS'),
  },
  {
    label: "Admin: Users",
    href: "/admin/users",
    allowed: (user) => hasPermission(user, 'ADMIN_ACCESS'),
  },
   {
    label: "Admin: Roles",
    href: "/admin/roles",
    allowed: (user) => hasPermission(user, 'ADMIN_ACCESS'),
  },
  {
    label: "Office Tasks",
    href: "/office/tasks",
    allowed: (user) => hasPermission(user, 'OFFICE_ACCESS'),
  },
  {
    label: "Tech: Front Dept",
    href: "/tech/front",
    allowed: (user) => hasPermission(user, 'TECH_FRONT_ACCESS'),
  },
    {
    label: "Tech: Mech Dept",
    href: "/tech/mech",
    allowed: (user) => hasPermission(user, 'TECH_MECH_ACCESS'),
  },
  {
    label: "Tech: CR Dept",
    href: "/tech/cr",
    allowed: (user) => hasPermission(user, 'TECH_CR_ACCESS'),
  },
];

export function generateMenu(user: UserProfile) {
  return ALL_MENU_ITEMS.filter(item => item.allowed(user));
}
