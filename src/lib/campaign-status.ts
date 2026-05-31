import type { Database } from "@/integrations/supabase/types";

export type CampaignStatus =
  | "draft"
  | "queued"
  | "generating"
  | "ready"
  | "sent"
  | "archived";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

/** Spanish label + badge classes for each step of the campaign status machine. */
export const CAMPAIGN_STATUS_META: Record<
  CampaignStatus,
  { label: string; badgeClass: string }
> = {
  draft: {
    label: "Borrador",
    badgeClass:
      "bg-muted text-muted-foreground hover:bg-muted border-transparent",
  },
  queued: {
    label: "En cola",
    badgeClass:
      "bg-gold-light text-night-900 hover:bg-gold-light border-transparent",
  },
  generating: {
    label: "Generando",
    badgeClass: "bg-teal text-night-900 hover:bg-teal border-transparent",
  },
  ready: {
    label: "Lista",
    badgeClass:
      "bg-success text-success-foreground hover:bg-success border-transparent",
  },
  sent: {
    label: "Enviada",
    badgeClass: "bg-gold text-night-900 hover:bg-gold border-transparent",
  },
  archived: {
    label: "Archivada",
    badgeClass: "bg-transparent text-muted-foreground border-border",
  },
};

export function getCampaignStatusMeta(status: CampaignRow["status"]) {
  return (
    CAMPAIGN_STATUS_META[status as CampaignStatus] ?? {
      label: status,
      badgeClass:
        "bg-muted text-muted-foreground hover:bg-muted border-transparent",
    }
  );
}
