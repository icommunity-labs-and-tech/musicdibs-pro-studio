import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Music4, Pause, Play, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AI_MUSIC_STUDIO } from "@/lib/campaign-generation-options";
import { cn } from "@/lib/utils";
import { ExperiencePublicService, type ExperienceStatField } from "@/lib/experience";

export const Route = createFileRoute("/play/$token")({
  head: () => ({
    meta: [
      { title: "Tu experiencia musical · MusicDibs" },
      {
        name: "description",
        content:
          "Escucha tu canción personalizada, creada con AI Music Studio.",
      },
      { property: "og:title", content: "Tu experiencia musical" },
      {
        property: "og:description",
        content: "Escucha tu canción personalizada, creada con AI Music Studio.",
      },
    ],
  }),
  component: PlayPage,
});

function track(token: string, field: ExperienceStatField) {
  void ExperiencePublicService.track(token, field);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Make a user-entered CTA link absolute. Without a protocol the browser
 * resolves the value relative to the current page (…/play/…), which is wrong.
 */
function normalizeCtaUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("mailto:") || url.startsWith("tel:")) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}

function PlayPage() {
  const { token } = Route.useParams();
  const visitorTrackedRef = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-experience", token],
    queryFn: () => ExperiencePublicService.get(token),
    staleTime: 30_000,
    retry: false,
  });

  // Count one unique visitor per browser per experience.
  useEffect(() => {
    if (!data || visitorTrackedRef.current) return;
    const key = `mdibs:visited:${token}`;
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        track(token, "unique_visitors");
      }
    } catch {
      // ignore storage failures
    }
    visitorTrackedRef.current = true;
  }, [data, token]);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-background to-muted/40"
      style={
        data?.branding?.background_color
          ? { background: data.branding.background_color }
          : undefined
      }
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando experiencia…</p>
        ) : isError || !data ? (
          <NotAvailable />
        ) : (
          <ExperienceView token={token} data={data} />
        )}
      </div>
    </div>
  );
}

function ExperienceView({
  token,
  data,
}: {
  token: string;
  data: NonNullable<Awaited<ReturnType<typeof ExperiencePublicService.get>>>;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(data.duration_seconds ?? 0);

  const primary = data.branding?.primary_color || undefined;
  const secondary = data.branding?.secondary_color || undefined;
  const audioUrl = data.audio_url || "";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      setPlaying(false);
      track(token, "completion_count");
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, [token]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
      if (!hasPlayedRef.current) {
        hasPlayedRef.current = true;
        track(token, "play_count");
      }
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  }

  function handleDownload() {
    if (!audioUrl) return;
    track(token, "download_count");
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${data.title || "cancion"}.mp3`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("¡Enlace copiado!");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  const subtitle = data.message_content?.trim() || "Tu canción exclusiva";
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const goldShadow = "0 12px 40px -8px color-mix(in oklab, var(--gold) 60%, transparent)";

  const ctaUrl = normalizeCtaUrl(data.cta_url || data.branding?.cta_url || "");
  const ctaTitle = data.cta_title || data.branding?.cta_text || "";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Logo */}
      {data.branding?.logo_url ? (
        <img
          src={data.branding.logo_url}
          alt={data.branding?.brand_name || "Logo"}
          className="h-8 w-auto object-contain"
        />
      ) : data.branding?.brand_name ? (
        <p
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ color: primary }}
        >
          {data.branding.brand_name}
        </p>
      ) : null}

      {/* Cover or animated warm gradient */}
      {data.cover_url ? (
        <img
          src={data.cover_url}
          alt={data.title}
          className="h-32 w-32 rounded-3xl object-cover shadow-lg sm:h-40 sm:w-40"
        />
      ) : (
        <div
          className="exp-gradient flex h-28 w-full items-center justify-center rounded-3xl shadow-lg sm:h-32"
          role="img"
          aria-label="Portada musical"
        >
          <Music4
            className="h-10 w-10 text-white/80"
            style={{ color: secondary }}
          />
        </div>
      )}

      {/* Title + subtitle */}
      <div className="space-y-1 text-center">
        <h1
          className="font-display text-2xl font-bold leading-tight sm:text-3xl"
          style={{ color: secondary }}
        >
          {data.title}
        </h1>
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>

      {audioUrl ? (
        <>
          {/* Hero play button */}
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pausar" : "Reproducir"}
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground",
              "transition-transform duration-200 ease-out hover:scale-105 active:scale-105",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
            style={{
              backgroundColor: primary || "var(--gold)",
              boxShadow: goldShadow,
            }}
          >
            {playing ? (
              <Pause className="h-9 w-9" fill="currentColor" />
            ) : (
              <Play className="h-9 w-9 translate-x-[2px]" fill="currentColor" />
            )}
          </button>

          {/* Progress bar */}
          <div className="w-full max-w-xs space-y-1.5">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
                style={{
                  width: `${pct}%`,
                  backgroundColor: primary || "var(--gold)",
                }}
              />
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={current}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Progreso de reproducción"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Secondary actions */}
          <div className="flex w-full max-w-xs gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Descargar
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          </div>
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          El audio aún no está disponible.
        </p>
      )}

      {/* CTA button (gold / brand) */}
      {ctaUrl && ctaTitle ? (
        <Button
          asChild
          className="w-full max-w-xs"
          style={{
            backgroundColor: primary || "var(--gold)",
            color: "var(--primary-foreground)",
          }}
        >
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
            {ctaTitle}
          </a>
        </Button>
      ) : null}

      {!data.branding?.hide_powered_by && <Footer />}
    </div>
  );
}

function NotAvailable() {
  return (
    <div className="space-y-3 text-center">
      <Music4 className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="font-display text-xl font-bold">
        Experiencia no disponible
      </h1>
      <p className="text-sm text-muted-foreground">
        Este enlace no existe o aún no se ha publicado.
      </p>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      {AI_MUSIC_STUDIO}
    </p>
  );
}
