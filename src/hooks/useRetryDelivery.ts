import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RetryResult {
  ok: boolean;
  capped: boolean;
  retryCount: number | null;
}

export function useRetryDelivery(campaignId: string) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const retry = async (
    deliveryId: string,
    firstName: string,
  ): Promise<RetryResult> => {
    setRetrying(deliveryId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-provider-campaign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: "retry_delivery",
            campaign_id: campaignId,
            delivery_id: deliveryId,
          }),
        },
      );
      const json = await res.json();

      // Cap reached → 409. Disable button immediately, no refresh.
      if (res.status === 409) {
        toast.error("Máximo de reintentos alcanzado", {
          description:
            "Este contacto no puede recibir más intentos de generación.",
        });
        return {
          ok: false,
          capped: true,
          retryCount: typeof json.retry_count === "number" ? json.retry_count : 3,
        };
      }

      if (!res.ok) throw new Error(json.error ?? "Error al reintentar");

      toast.success("Reintento iniciado", {
        description: `Generando canción para ${firstName}...`,
      });
      // Refresh deliveries list so the status moves from "failed" to "generating"
      void queryClient.invalidateQueries({
        queryKey: ["personalized-deliveries", campaignId],
      });
      return {
        ok: true,
        capped: false,
        retryCount: typeof json.retry_count === "number" ? json.retry_count : null,
      };
    } catch (err: unknown) {
      toast.error("Error al reintentar", {
        description: err instanceof Error ? err.message : "Inténtalo de nuevo",
      });
      return { ok: false, capped: false, retryCount: null };
    } finally {
      setRetrying(null);
    }
  };

  return { retry, retrying };
}
