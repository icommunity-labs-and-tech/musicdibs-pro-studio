import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

import { FullScreenLoader } from "@/components/app/full-screen-loader";
import { useAuth } from "@/components/auth/auth-provider";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedGuard,
});

function AuthenticatedGuard() {
  const { loading, session } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" />;

  return <Outlet />;
}
