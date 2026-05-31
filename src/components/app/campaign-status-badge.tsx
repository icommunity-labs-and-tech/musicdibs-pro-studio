import { Badge } from "@/components/ui/badge";
import { getCampaignStatusMeta } from "@/lib/campaign-status";
import { cn } from "@/lib/utils";

export function CampaignStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = getCampaignStatusMeta(status);
  return (
    <Badge className={cn(meta.badgeClass, className)}>{meta.label}</Badge>
  );
}
