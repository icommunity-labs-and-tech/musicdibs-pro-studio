import type { Database } from "@/integrations/supabase/types";

// Campaign lifecycle. `draft` is the default; the remaining values prepare the
// future AI Music Studio generation lifecycle (no generation logic yet).
// Legacy values (queued / ready / archived) are kept for back-compat with
// existing rows.
export type CampaignStatus =
  | "draft"
  | "ready_to_generate"
  | "generating"
  | "completed"
  | "failed"
  | "sent"
  // legacy
  | "queued"
  | "ready"
  | "archived";

/** Only campaigns in this status may be edited in the Campaign Builder. */
export const EDITABLE_STATUSES: CampaignStatus[] = ["draft"];

export function isCampaignEditable(status: string): boolean {
  return (EDITABLE_STATUSES as string[]).includes(status);
}

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
  ready_to_generate: {
    label: "Lista para generar",
    badgeClass:
      "bg-gold-light text-night-900 hover:bg-gold-light border-transparent",
  },
  generating: {
    label: "Generando",
    badgeClass: "bg-teal text-night-900 hover:bg-teal border-transparent",
  },
  completed: {
    label: "Completada",
    badgeClass:
      "bg-success text-success-foreground hover:bg-success border-transparent",
  },
  failed: {
    label: "Fallida",
    badgeClass:
      "bg-destructive text-destructive-foreground hover:bg-destructive border-transparent",
  },
  sent: {
    label: "Enviada",
    badgeClass: "bg-gold text-night-900 hover:bg-gold border-transparent",
  },
  // legacy
  queued: {
    label: "En cola",
    badgeClass:
      "bg-gold-light text-night-900 hover:bg-gold-light border-transparent",
  },
  ready: {
    label: "Lista",
    badgeClass:
      "bg-success text-success-foreground hover:bg-success border-transparent",
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
