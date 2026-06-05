import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/components/auth/auth-provider";
import { FullScreenLoader } from "@/components/app/full-screen-loader";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminGuard,
});

function AdminGuard() {
  const { loading, profile } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!profile?.is_superadmin) return <Navigate to="/dashboard" />;

  return <Outlet />;
}
