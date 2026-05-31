import { cn } from "@/lib/utils";

/** Animated bars shown while a campaign's songs are being generated. */
export function GenerationWaveform({
  className,
  bars = 9,
}: {
  className?: string;
  bars?: number;
}) {
  return (
    <div
      className={cn("flex items-end gap-1", className)}
      role="img"
      aria-label="Generando audio"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="animate-waveform-bar block w-1 rounded-full bg-teal"
          style={{
            height: 28,
            animationDelay: `${(i % 5) * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}
