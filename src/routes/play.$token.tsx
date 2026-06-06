import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Music4, Sparkles } from "lucide-react";

import { AudioPlayer } from "@/components/app/audio-player";
import { Button } from "@/components/ui/button";
import { AI_MUSIC_STUDIO } from "@/lib/campaign-generation-options";
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

  const primary = data?.branding?.primary_color || undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-10">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando experiencia…</p>
        ) : isError || !data ? (
          <NotAvailable />
        ) : (
          <div className="w-full space-y-6">
            {/* Logo / brand */}
            {data.branding?.logo_url ? (
              <div className="flex justify-center">
                <img
                  src={data.branding.logo_url}
                  alt="Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
            ) : null}

            {/* Cover */}
            <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              {data.cover_url ? (
                <img
                  src={data.cover_url}
                  alt={data.title}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-muted">
                  <Music4 className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold">{data.title}</h1>
            </div>

            {/* Player */}
            {data.audio_url ? (
              <AudioPlayer
                src={data.audio_url}
                onPlay={() => track(token, "play_count")}
                onEnded={() => track(token, "completion_count")}
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                El audio aún no está disponible.
              </p>
            )}

            {/* Experience message (optional, configured by the owner) */}
            {data.message_content ? (
              <div className="rounded-2xl border bg-card p-5">
                <p className="whitespace-pre-line text-center text-sm leading-relaxed">
                  {data.message_content}
                </p>
              </div>
            ) : null}

            {/* CTA button */}
            {(() => {
              const ctaUrl = data.cta_url || data.branding?.cta_url || "";
              const ctaTitle =
                data.cta_title || data.branding?.cta_text || "";
              if (!ctaUrl || !ctaTitle) return null;
              return (
                <Button
                  asChild
                  className="w-full"
                  style={
                    primary
                      ? { backgroundColor: primary, color: "#fff" }
                      : undefined
                  }
                >
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                    {ctaTitle}
                  </a>
                </Button>
              );
            })()}

            <Footer />
          </div>
        )}
      </div>
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
    <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      {AI_MUSIC_STUDIO}
    </p>
  );
}
