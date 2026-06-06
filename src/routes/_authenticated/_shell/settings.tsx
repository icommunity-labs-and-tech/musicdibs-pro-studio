import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/settings")({
  head: () => ({ meta: [{ title: "Ajustes · Musicdibs Enterprise" }] }),
  component: SettingsLayout,
});

const TABS = [
  { to: "/settings", label: "General", exact: true },
  { to: "/settings/sender", label: "Remitente", exact: false },
  { to: "/settings/providers", label: "Proveedores", exact: false },
  { to: "/settings/billing", label: "Facturación", exact: false },
] as const;

function SettingsLayout() {
  const { pathname } = useLocation();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura tu espacio de trabajo.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.to
            : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
