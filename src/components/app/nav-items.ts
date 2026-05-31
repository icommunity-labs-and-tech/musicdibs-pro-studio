import {
  BarChart3,
  Code2,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Settings,
  Users,
  Users2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to:
    | "/dashboard"
    | "/campaigns"
    | "/contacts"
    | "/analytics"
    | "/team"
    | "/developers"
    | "/audit-log"
    | "/settings";
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Campañas", to: "/campaigns", icon: Megaphone },
  { label: "Contactos", to: "/contacts", icon: Users },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Equipo", to: "/team", icon: Users2 },
  { label: "Desarrolladores", to: "/developers", icon: Code2 },
  { label: "Registro", to: "/audit-log", icon: ScrollText },
  { label: "Ajustes", to: "/settings", icon: Settings },
];
