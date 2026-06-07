import {
  BarChart3,
  Code2,
  LayoutDashboard,
  Megaphone,
  Radio,
  ScrollText,
  Settings,
  Users2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to:
    | "/dashboard"
    | "/campaigns"
    | "/audiences"
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
  { label: "Audiencias", to: "/audiences", icon: Radio },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Equipo", to: "/team", icon: Users2 },
  { label: "Desarrolladores", to: "/developers", icon: Code2 },
  { label: "Registro", to: "/audit-log", icon: ScrollText },
  { label: "Ajustes", to: "/settings", icon: Settings },
];
