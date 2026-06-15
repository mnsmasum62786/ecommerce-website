import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Boxes,
  Ticket,
  Code2,
  Webhook,
  Settings,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

// Shared admin navigation, used by both the desktop sidebar and the mobile nav.
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/scripts", label: "Script Manager", icon: Code2 },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/users", label: "Admin Users", icon: UserCog },
];
