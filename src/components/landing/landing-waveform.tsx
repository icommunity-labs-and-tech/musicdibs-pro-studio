import { cn } from "@/lib/utils";

/**
 * Decorative animated equalizer — the brand's "sound made visible".
 * Pure CSS animation (no JS loop), respects prefers-reduced-motion.
 */
export function LandingWaveform({
  className,
  bars = 48,
  barClassName,
}: {
  className?: string;
  bars?: number;
  barClassName?: string;
}) {
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center gap-[3px]", className)}
      role="img"
      aria-label="Visualización de onda de audio"
    >
      {Array.from({ length: bars }).map((_, i) => {
        // Smooth bell-shaped baseline height so the center is tallest.
        const center = (bars - 1) / 2;
        const dist = Math.abs(i - center) / center;
        const base = 0.35 + (1 - dist) * 0.65;
        return (
          <span
            key={i}
            className={cn(
              "ld-bar block w-[3px] rounded-full bg-gradient-to-t from-teal to-gold",
              barClassName,
            )}
            style={{
              height: `${Math.round(base * 100)}%`,
              animationDelay: `${(i * 0.06) % 1.2}s`,
              animationDuration: `${1 + (i % 5) * 0.18}s`,
            }}
          />
        );
      })}
    </div>
  );
}
