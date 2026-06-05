import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/_shell/settings/billing")({
  component: BillingSettingsPage,
});

function BillingSettingsPage() {
  const { tenant } = useAuth();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <CreditCard className="h-4 w-4" />
            Facturación
          </CardTitle>
          {tenant?.plan ? (
            <Badge variant="secondary" className="capitalize">
              Plan {tenant.plan}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          Gestiona tu plan y método de pago.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          La gestión de facturación estará disponible próximamente.
        </p>
      </CardContent>
    </Card>
  );
}
