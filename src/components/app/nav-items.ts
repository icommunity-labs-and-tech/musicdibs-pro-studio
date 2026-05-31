import {
  BarChart3,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: "/dashboard" | "/campaigns" | "/contacts" | "/analytics" | "/settings";
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Campañas", to: "/campaigns", icon: Megaphone },
  { label: "Contactos", to: "/contacts", icon: Users },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Ajustes", to: "/settings", icon: Settings },
];
