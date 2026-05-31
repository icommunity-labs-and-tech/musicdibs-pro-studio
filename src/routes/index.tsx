import { createFileRoute, Navigate } from "@tanstack/react-router";

import { FullScreenLoader } from "@/components/app/full-screen-loader";
import { useAuth } from "@/components/auth/auth-provider";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const { loading, session } = useAuth();

  if (loading) return <FullScreenLoader />;
  return <Navigate to={session ? "/dashboard" : "/login"} />;
}
