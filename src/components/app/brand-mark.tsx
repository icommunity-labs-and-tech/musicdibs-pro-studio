import { Link } from "@tanstack/react-router";

import logoMusicdibs from "@/assets/logo-musicdibs.jpg";
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
      <img
        src={logoMusicdibs}
        alt="Musicdibs"
        className="h-9 w-9 shrink-0 rounded-lg object-cover"
      />
      <span className="flex flex-col">
        <span className="font-display text-base font-semibold leading-none">
          Musicdibs
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
