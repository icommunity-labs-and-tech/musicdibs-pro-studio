import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { useAuth } from "@/components/auth/auth-provider";

export const Route = createFileRoute("/_authenticated/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const { tenant, loading } = useAuth();

  // Gate the product behind onboarding until the tenant is set up.
  if (!loading && tenant && !tenant.setup_complete) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
