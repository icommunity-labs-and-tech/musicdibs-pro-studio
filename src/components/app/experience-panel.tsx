import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AI_MUSIC_STUDIO } from "@/lib/campaign-generation-options";
import { buildExperienceUrl, type ExperienceBranding } from "@/lib/experience";
import { ExperiencePublishSection } from "@/components/app/experience-publish-section";
import {
  useCampaignExperience,
  useCreateExperience,
  useSetExperienceStatus,
  useUpdateExperienceBranding,
  useUpdateExperienceContent,
} from "@/hooks/use-experience";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicada",
  archived: "Archivada",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success text-success-foreground",
  archived: "bg-muted text-muted-foreground",
};

export interface ExperiencePanelProps {
  campaignId: string;
  tenantId: string | null | undefined;
  generationJobId: string | null;
  audioAssetId: string | null;
  lyricsAssetId: string | null;
  defaultTitle: string;
  /** Experiences can only be created/managed from an approved campaign. */
  approved: boolean;
}

interface ExperienceContentDraft {
  message_content: string;
  cta_title: string;
  cta_url: string;
}

export function ExperiencePanel({
  campaignId,
  tenantId,
  generationJobId,
  audioAssetId,
  lyricsAssetId,
  defaultTitle,
  approved,
}: ExperiencePanelProps) {
  const { data: experience, isLoading } = useCampaignExperience(campaignId);
  const createExperience = useCreateExperience();
  const setStatus = useSetExperienceStatus(campaignId);
  const updateBranding = useUpdateExperienceBranding(campaignId);
  const updateContent = useUpdateExperienceContent(campaignId);

  const [copied, setCopied] = useState(false);
  const [branding, setBranding] = useState<ExperienceBranding>({});
  const [content, setContent] = useState<ExperienceContentDraft>({
    message_content: "",
    cta_title: "",
    cta_url: "",
  });

  useEffect(() => {
    if (experience) {
      setBranding(experience.branding ?? {});
      setContent({
        message_content: experience.message_content ?? "",
        cta_title: experience.cta_title ?? "",
        cta_url: experience.cta_url ?? "",
      });
    }
  }, [experience]);

  const handleCreate = () => {
    if (!tenantId) return;
    createExperience.mutate(
      {
        tenantId,
        campaignId,
        generationJobId,
        audioAssetId,
        lyricsAssetId,
        title: defaultTitle,
      },
      {
        onSuccess: () => toast.success("Página de experiencia creada"),
        onError: (e: unknown) =>
          toast.error("No pudimos crear la experiencia", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No pudimos copiar el enlace");
    }
  };

  const handleTogglePublish = () => {
    if (!experience) return;
    const next = experience.status === "published" ? "draft" : "published";
    setStatus.mutate(
      { id: experience.id, status: next },
      {
        onSuccess: () =>
          toast.success(
            next === "published"
              ? "Experiencia publicada"
              : "Experiencia despublicada",
          ),
        onError: (e: unknown) =>
          toast.error("No pudimos actualizar el estado", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  const handleSaveBranding = () => {
    if (!experience) return;
    updateBranding.mutate(
      { id: experience.id, branding },
      {
        onSuccess: () => toast.success("Branding actualizado"),
        onError: (e: unknown) =>
          toast.error("No pudimos guardar el branding", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  const handleSaveContent = () => {
    if (!experience) return;
    updateContent.mutate(
      {
        id: experience.id,
        content: {
          message_content: content.message_content.trim() || null,
          cta_title: content.cta_title.trim() || null,
          cta_url: content.cta_url.trim() || null,
        },
      },
      {
        onSuccess: () => toast.success("Experiencia actualizada"),
        onError: (e: unknown) =>
          toast.error("No pudimos guardar el contenido", {
            description: e instanceof Error ? e.message : undefined,
          }),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Share2 className="h-4 w-4 text-primary" />
          Página de experiencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!approved ? (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm">
              Aprueba una versión generada antes de continuar.
            </p>
          </div>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !experience ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Publica la versión aprobada como una página de experiencia pública
              con reproductor y tu marca. Obtendrás un enlace para insertar en tus
              campañas de tu plataforma de marketing.
            </p>
            <Button onClick={handleCreate} disabled={createExperience.isPending}>
              {createExperience.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              Crear página de experiencia
            </Button>
          </div>
        ) : (
          <>
            <ExperienceBody
              url={buildExperienceUrl(experience.experience_token)}
              status={experience.status}
              copied={copied}
              onCopy={handleCopy}
              onTogglePublish={handleTogglePublish}
              togglingPublish={setStatus.isPending}
              branding={branding}
              setBranding={setBranding}
              onSaveBranding={handleSaveBranding}
              savingBranding={updateBranding.isPending}
            />

            <ExperienceContentSettings
              content={content}
              setContent={setContent}
              onSave={handleSaveContent}
              saving={updateContent.isPending}
            />

            <ExperiencePublishSection
              experience={experience}
              tenantId={tenantId}
            />
          </>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {AI_MUSIC_STUDIO}
        </p>
      </CardContent>
    </Card>
  );
}

function ExperienceContentSettings({
  content,
  setContent,
  onSave,
  saving,
}: {
  content: ExperienceContentDraft;
  setContent: (c: ExperienceContentDraft) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <MessageSquare className="h-4 w-4 text-primary" />
        Mensaje de la experiencia
      </p>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Mensaje (opcional)
        </Label>
        <Textarea
          value={content.message_content}
          placeholder={
            "Gracias por formar parte de nuestra comunidad. Usa el código WELCOME25 antes del 31 de julio."
          }
          rows={3}
          onChange={(e) =>
            setContent({ ...content, message_content: e.target.value })
          }
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Título del botón (CTA)
          </Label>
          <Input
            value={content.cta_title}
            placeholder="Descubre más"
            onChange={(e) =>
              setContent({ ...content, cta_title: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Enlace del botón (CTA)
          </Label>
          <Input
            value={content.cta_url}
            placeholder="https://tu-web.com"
            onChange={(e) => setContent({ ...content, cta_url: e.target.value })}
          />
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Guardar mensaje
      </Button>
    </div>
  );
}



function ExperienceBody({
  url,
  status,
  copied,
  onCopy,
  onTogglePublish,
  togglingPublish,
  branding,
  setBranding,
  onSaveBranding,
  savingBranding,
}: {
  url: string;
  status: string;
  copied: boolean;
  onCopy: (url: string) => void;
  onTogglePublish: () => void;
  togglingPublish: boolean;
  branding: ExperienceBranding;
  setBranding: (b: ExperienceBranding) => void;
  onSaveBranding: () => void;
  savingBranding: boolean;
}) {
  const isPublished = status === "published";


  return (
    <div className="space-y-5">
      {/* Status + publish */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge className={STATUS_CLASSES[status] ?? "bg-muted"}>
          {STATUS_LABELS[status] ?? status}
        </Badge>
        <Button
          size="sm"
          variant={isPublished ? "outline" : "default"}
          onClick={onTogglePublish}
          disabled={togglingPublish}
        >
          {togglingPublish ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : isPublished ? (
            <EyeOff className="mr-1.5 h-4 w-4" />
          ) : (
            <Eye className="mr-1.5 h-4 w-4" />
          )}
          {isPublished ? "Despublicar" : "Publicar"}
        </Button>
      </div>

      {/* Experience URL */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Enlace de la experiencia
        </Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button
            size="icon"
            variant="outline"
            onClick={() => onCopy(url)}
            aria-label="Copiar enlace"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button size="icon" variant="outline" asChild aria-label="Abrir enlace">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
        {!isPublished ? (
          <p className="text-xs text-muted-foreground">
            Publica la experiencia para que el enlace sea accesible
            públicamente.
          </p>
        ) : null}
      </div>

      {/* Branding */}
      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-medium">Marca</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="URL del logo"
            value={branding.logo_url ?? ""}
            placeholder="https://…/logo.png"
            onChange={(v) => setBranding({ ...branding, logo_url: v })}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Color principal
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primary_color ?? "#6366f1"}
                onChange={(e) =>
                  setBranding({ ...branding, primary_color: e.target.value })
                }
                className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                aria-label="Color principal"
              />
              <Input
                value={branding.primary_color ?? ""}
                placeholder="#6366f1"
                onChange={(e) =>
                  setBranding({ ...branding, primary_color: e.target.value })
                }
                className="font-mono text-xs"
              />
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onSaveBranding}
          disabled={savingBranding}
        >
          {savingBranding ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : null}
          Guardar branding
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-1 font-display text-2xl font-bold">
        {value.toLocaleString("es-ES")}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
