import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Loader2,
  Music2,
  PenLine,
  Rocket,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import {
  AI_MUSIC_STUDIO,
  GENERATION_LANGUAGES,
  GENERATION_MODES,
  GENERATION_MOODS,
  GENERATION_MUSIC_STYLES,
  VOICE_TYPES,
  estimateCredits,
  genLabelFor,
  type GenerationLanguage,
  type GenerationMode,
  type VoiceType,
} from "@/lib/campaign-generation-options";
import { getProviderMeta } from "@/lib/providers";
import {
  useProviderAudiences,
  useProviderConnections,
  type ProviderAudienceRow,
} from "@/hooks/use-providers";
import { useCreateGenerationCampaign } from "@/hooks/use-campaign-generation-config";

export const Route = createFileRoute("/_authenticated/_shell/campaigns/new")({
  head: () => ({ meta: [{ title: "Nueva campaña · Musicdibs Enterprise" }] }),
  component: CampaignBuilderPage,
});

const AUDIENCE_TYPE_LABELS: Record<string, string> = {
  list: "Lista",
  segment: "Segmento",
  automation: "Automatización",
};

interface BuilderState {
  name: string;
  generationMode: GenerationMode | "";
  audienceId: string;
  lyricsGoal: string;
  lyricsPrompt: string;
  musicStyle: string;
  voiceType: VoiceType | "";
  language: GenerationLanguage;
  mood: string;
  includeFirstName: boolean;
}

type StepKey =
  | "type"
  | "audience"
  | "lyrics"
  | "music"
  | "personalization"
  | "review";

function CampaignBuilderPage() {
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
  const createCampaign = useCreateGenerationCampaign();
  const { data: audiences, isLoading: audiencesLoading } = useProviderAudiences(
    tenant?.id,
  );
  const { data: connections } = useProviderConnections(tenant?.id);

  const [step, setStep] = useState(0);
  const [state, setState] = useState<BuilderState>({
    name: "",
    generationMode: "",
    audienceId: "",
    lyricsGoal: "",
    lyricsPrompt: "",
    musicStyle: "",
    voiceType: "",
    language: "es",
    mood: "",
    includeFirstName: false,
  });

  const update = <K extends keyof BuilderState>(
    key: K,
    value: BuilderState[K],
  ) => setState((prev) => ({ ...prev, [key]: value }));

  // Map connection id -> provider label for display.
  const providerLabelByConnection = useMemo(() => {
    const map = new Map<string, string>();
    (connections ?? []).forEach((c) => {
      try {
        map.set(c.id, getProviderMeta(c.provider_type).label);
      } catch {
        map.set(c.id, c.provider_type);
      }
    });
    return map;
  }, [connections]);

  const selectedAudience = useMemo(
    () => (audiences ?? []).find((a) => a.id === state.audienceId) ?? null,
    [audiences, state.audienceId],
  );

  const estimatedCredits = useMemo(
    () =>
      estimateCredits(
        state.generationMode,
        selectedAudience?.contacts_count ?? 0,
      ),
    [state.generationMode, selectedAudience],
  );

  const steps = useMemo(() => {
    const base: { key: StepKey; title: string; icon: typeof Rocket }[] = [
      { key: "type", title: "Tipo de campaña", icon: Rocket },
      { key: "audience", title: "Audiencia", icon: Users },
      { key: "lyrics", title: "Configuración de letra", icon: PenLine },
      { key: "music", title: "Configuración musical", icon: Music2 },
    ];
    if (state.generationMode === "personalized_song") {
      base.push({
        key: "personalization",
        title: "Personalización",
        icon: UserCheck,
      });
    }
    base.push({ key: "review", title: "Revisión", icon: Sparkles });
    return base;
  }, [state.generationMode]);

  const currentKey = steps[Math.min(step, steps.length - 1)]?.key ?? "type";

  const stepValid = useMemo(() => {
    switch (currentKey) {
      case "type":
        return state.name.trim().length > 0 && state.generationMode !== "";
      case "audience":
        return state.audienceId.length > 0;
      case "lyrics":
        return state.lyricsGoal.trim().length > 0;
      case "music":
        return (
          state.musicStyle.length > 0 &&
          state.voiceType !== "" &&
          state.language.length > 0 &&
          state.mood.length > 0
        );
      default:
        return true;
    }
  }, [currentKey, state]);

  const isLastStep = step >= steps.length - 1;

  const handleSubmit = async () => {
    if (!tenant?.id || !selectedAudience || state.generationMode === "") {
      toast.error("Faltan datos para crear la campaña");
      return;
    }
    try {
      const id = await createCampaign.mutateAsync({
        tenantId: tenant.id,
        createdBy: user?.id ?? null,
        vertical: tenant.vertical ?? "music",
        name: state.name.trim(),
        generationMode: state.generationMode,
        providerConnectionId: selectedAudience.provider_connection_id,
        providerAudienceId: selectedAudience.id,
        audienceContacts: selectedAudience.contacts_count,
        lyricsGoal: state.lyricsGoal.trim() || null,
        lyricsPrompt: state.lyricsPrompt.trim() || null,
        musicStyle: state.musicStyle || null,
        voiceType: state.voiceType === "" ? null : state.voiceType,
        language: state.language,
        mood: state.mood || null,
        includeFirstName:
          state.generationMode === "personalized_song"
            ? state.includeFirstName
            : false,
        estimatedCredits,
      });
      toast.success("Configuración de campaña guardada");
      void navigate({ to: "/campaigns/$id", params: { id } });
    } catch (e) {
      toast.error("No pudimos guardar la campaña", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2 text-muted-foreground"
          onClick={() => void navigate({ to: "/campaigns" })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Campañas
        </Button>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Nueva campaña
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configura tu campaña de música generada con IA. {AI_MUSIC_STUDIO}.
        </p>
      </div>

      <Stepper steps={steps} step={step} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {steps[Math.min(step, steps.length - 1)]?.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {currentKey === "type" && (
            <StepType
              state={state}
              update={update}
              estimatedCredits={estimatedCredits}
            />
          )}
          {currentKey === "audience" && (
            <StepAudience
              audiences={audiences ?? []}
              loading={audiencesLoading}
              selectedId={state.audienceId}
              onSelect={(id) => update("audienceId", id)}
              providerLabelByConnection={providerLabelByConnection}
              generationMode={state.generationMode}
              estimatedCredits={estimatedCredits}
            />
          )}
          {currentKey === "lyrics" && (
            <StepLyrics state={state} update={update} />
          )}
          {currentKey === "music" && (
            <StepMusic state={state} update={update} />
          )}
          {currentKey === "personalization" && (
            <StepPersonalization state={state} update={update} />
          )}
          {currentKey === "review" && (
            <StepReview
              state={state}
              selectedAudience={selectedAudience}
              providerLabelByConnection={providerLabelByConnection}
              estimatedCredits={estimatedCredits}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || createCampaign.isPending}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Atrás
        </Button>

        {isLastStep ? (
          <Button
            onClick={() => void handleSubmit()}
            disabled={createCampaign.isPending}
          >
            {createCampaign.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            Guardar configuración
          </Button>
        ) : (
          <Button
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={!stepValid}
          >
            Siguiente
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({
  steps,
  step,
}: {
  steps: { key: string; title: string; icon: typeof Rocket }[];
  step: number;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isDone = i < step;
        const isCurrent = i === step;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-colors",
                isCurrent && "border-primary bg-primary text-primary-foreground",
                isDone && "border-success bg-success text-success-foreground",
                !isCurrent && !isDone && "border-border text-muted-foreground",
              )}
            >
              {isDone ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1",
                  i < step ? "bg-success" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface StepProps {
  state: BuilderState;
  update: <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => void;
}

// ── STEP 1 · Campaign Type ───────────────────────────────────────────────────
function StepType({
  state,
  update,
  estimatedCredits,
}: StepProps & { estimatedCredits: number }) {
  return (
    <>
      <Field label="Nombre de la campaña" htmlFor="name" required>
        <Input
          id="name"
          value={state.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ej. Felicitación de cumpleaños 2026"
          maxLength={120}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {GENERATION_MODES.map((mode) => {
          const active = state.generationMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => update("generationMode", mode.value)}
              className={cn(
                "flex h-full flex-col items-start rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">{mode.label}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                <Coins className="h-3 w-3" />
                {mode.creditLabel}
              </span>
            </button>
          );
        })}
      </div>

      {state.generationMode === "single_song" && (
        <p className="text-xs text-muted-foreground">
          Coste estimado: {estimatedCredits.toLocaleString("es-ES")} créditos.
        </p>
      )}
    </>
  );
}

// ── STEP 2 · Audience ────────────────────────────────────────────────────────
function StepAudience({
  audiences,
  loading,
  selectedId,
  onSelect,
  providerLabelByConnection,
  generationMode,
  estimatedCredits,
}: {
  audiences: ProviderAudienceRow[];
  loading: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  providerLabelByConnection: Map<string, string>;
  generationMode: GenerationMode | "";
  estimatedCredits: number;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando audiencias…
      </div>
    );
  }

  if (audiences.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No hay audiencias sincronizadas"
        description="Conecta un proveedor y sincroniza tus audiencias para seleccionarlas aquí."
        action={
          <Button asChild>
            <Link to="/settings/providers">Ir a proveedores</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {audiences.map((a) => {
          const active = selectedId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50",
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{a.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {AUDIENCE_TYPE_LABELS[a.audience_type] ?? a.audience_type} ·{" "}
                  {providerLabelByConnection.get(a.provider_connection_id) ??
                    "Proveedor"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">
                  {a.contacts_count.toLocaleString("es-ES")}
                </p>
                <p className="text-xs text-muted-foreground">contactos</p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedId && generationMode !== "" && (
        <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/5 p-4">
          <span className="text-sm text-muted-foreground">
            Créditos estimados
          </span>
          <span className="font-display text-lg font-bold text-primary">
            {estimatedCredits.toLocaleString("es-ES")}
          </span>
        </div>
      )}
    </>
  );
}

// ── STEP 3 · Lyrics Configuration ────────────────────────────────────────────
function StepLyrics({ state, update }: StepProps) {
  return (
    <>
      <Field label="Objetivo de la campaña" htmlFor="lyrics-goal" required>
        <Textarea
          id="lyrics-goal"
          value={state.lyricsGoal}
          onChange={(e) => update("lyricsGoal", e.target.value)}
          placeholder="Describe qué quieres comunicar a través de esta campaña."
          rows={3}
          maxLength={500}
        />
      </Field>
      <Field label="Instrucciones para la letra" htmlFor="lyrics-prompt">
        <Textarea
          id="lyrics-prompt"
          value={state.lyricsPrompt}
          onChange={(e) => update("lyricsPrompt", e.target.value)}
          placeholder="Añade instrucciones adicionales para la generación de la letra."
          rows={4}
          maxLength={1000}
        />
      </Field>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        {AI_MUSIC_STUDIO}
      </p>
    </>
  );
}

// ── STEP 4 · Music Configuration ─────────────────────────────────────────────
function StepMusic({ state, update }: StepProps) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Estilo musical" required>
          <Select
            value={state.musicStyle}
            onValueChange={(v) => update("musicStyle", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un estilo" />
            </SelectTrigger>
            <SelectContent>
              {GENERATION_MUSIC_STYLES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tipo de voz" required>
          <Select
            value={state.voiceType}
            onValueChange={(v) => update("voiceType", v as VoiceType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una voz" />
            </SelectTrigger>
            <SelectContent>
              {VOICE_TYPES.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Idioma" required>
          <Select
            value={state.language}
            onValueChange={(v) => update("language", v as GenerationLanguage)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un idioma" />
            </SelectTrigger>
            <SelectContent>
              {GENERATION_LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Mood" required>
          <Select value={state.mood} onValueChange={(v) => update("mood", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un mood" />
            </SelectTrigger>
            <SelectContent>
              {GENERATION_MOODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        {AI_MUSIC_STUDIO}
      </p>
    </>
  );
}

// ── STEP 5 · Personalization ─────────────────────────────────────────────────
function StepPersonalization({ state, update }: StepProps) {
  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
        <Checkbox
          checked={state.includeFirstName}
          onCheckedChange={(c) => update("includeFirstName", c === true)}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium">
            Incluir el nombre del destinatario
          </span>
          <span className="block text-sm text-muted-foreground">
            La canción generada podrá incluir el nombre del destinatario.
          </span>
        </span>
      </label>
      <p className="text-xs text-muted-foreground">
        Esta opción solo configura la generación futura. No se obtiene ni
        almacena ningún dato de contacto todavía.
      </p>
    </div>
  );
}

// ── STEP 6 · Review ──────────────────────────────────────────────────────────
function StepReview({
  state,
  selectedAudience,
  providerLabelByConnection,
  estimatedCredits,
}: {
  state: BuilderState;
  selectedAudience: ProviderAudienceRow | null;
  providerLabelByConnection: Map<string, string>;
  estimatedCredits: number;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Campaña", value: state.name || "—" },
    {
      label: "Tipo de campaña",
      value: genLabelFor(GENERATION_MODES, state.generationMode || undefined),
    },
    { label: "Audiencia", value: selectedAudience?.name ?? "—" },
    {
      label: "Tamaño de la audiencia",
      value: selectedAudience
        ? `${selectedAudience.contacts_count.toLocaleString("es-ES")} contactos`
        : "—",
    },
    {
      label: "Proveedor",
      value: selectedAudience
        ? providerLabelByConnection.get(
            selectedAudience.provider_connection_id,
          ) ?? "—"
        : "—",
    },
    {
      label: "Estilo musical",
      value: genLabelFor(GENERATION_MUSIC_STYLES, state.musicStyle),
    },
    { label: "Tipo de voz", value: genLabelFor(VOICE_TYPES, state.voiceType) },
    { label: "Idioma", value: genLabelFor(GENERATION_LANGUAGES, state.language) },
    { label: "Mood", value: genLabelFor(GENERATION_MOODS, state.mood) },
  ];

  if (state.generationMode === "personalized_song") {
    rows.push({
      label: "Personalización",
      value: state.includeFirstName
        ? "Incluye el nombre del destinatario"
        : "Sin personalización de nombre",
    });
  }

  return (
    <div className="space-y-4">
      <dl className="divide-y divide-border rounded-xl border">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="text-right text-sm font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>

      {state.lyricsGoal && (
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Objetivo</p>
          <p className="mt-1 text-sm">{state.lyricsGoal}</p>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border-2 border-primary bg-primary/5 p-5">
        <div className="flex items-center gap-3">
          <Coins className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm font-medium">Consumo estimado de créditos</p>
            <p className="text-xs text-muted-foreground">{AI_MUSIC_STUDIO}</p>
          </div>
        </div>
        <p className="font-display text-2xl font-bold text-primary">
          {estimatedCredits.toLocaleString("es-ES")}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        La campaña se guardará como <strong>borrador</strong>. La generación de
        música aún no se ejecuta.
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
