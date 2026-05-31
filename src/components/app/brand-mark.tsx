import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  subtitle = "Enterprise",
  asLink = true,
}: {
  className?: string;
  subtitle?: string;
  asLink?: boolean;
}) {
  const inner = (
    <span className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-teal font-display text-lg font-bold text-night-900">
        M
      </span>
      <span className="flex flex-col">
        <span className="font-display text-base font-semibold leading-none">
          MusicDibs
        </span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </span>
  );

  if (!asLink) return <span className={className}>{inner}</span>;

  return (
    <Link to="/dashboard" className={cn("inline-flex", className)}>
      {inner}
    </Link>
  );
}
