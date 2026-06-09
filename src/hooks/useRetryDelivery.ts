import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useRetryDelivery(campaignId: string) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const retry = async (deliveryId: string, firstName: string) => {
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
      if (!res.ok) throw new Error(json.error ?? "Error al reintentar");
      toast.success("Reintento iniciado", {
        description: `Generando canción para ${firstName}...`,
      });
      // Refresh deliveries list so the status moves from "failed" to "generating"
      void queryClient.invalidateQueries({
        queryKey: ["personalized-deliveries", campaignId],
      });
    } catch (err: unknown) {
      toast.error("Error al reintentar", {
        description: err instanceof Error ? err.message : "Inténtalo de nuevo",
      });
    } finally {
      setRetrying(null);
    }
  };

  return { retry, retrying };
}
