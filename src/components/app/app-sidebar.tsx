import { Link, useRouterState } from "@tanstack/react-router";

import { BrandMark } from "@/components/app/brand-mark";
import { NAV_ITEMS } from "@/components/app/nav-items";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              "min-h-11", // comfortable tap target on mobile
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" />
            {label}
            {active ? (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Persistent sidebar — visible from the `md` breakpoint up. */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b px-5">
        <BrandMark />
      </div>
      <SidebarNav />
      <div className="border-t px-5 py-4 text-xs text-muted-foreground">
        iCommunity Labs
      </div>
    </aside>
  );
}
