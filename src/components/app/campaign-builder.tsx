import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Loader2,
  Mail,
  Music2,
  PenLine,
  RefreshCw,
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
  calculateEstimatedCredits,
  type GenerationLanguage,
  type GenerationMode,
  type VoiceType,
} from "@/lib/campaign-generation-options";
import {
  audienceTypeLabel,
  buildCampaignConfigRows,
} from "@/lib/campaign-generation-summary";
import { getProviderMeta } from "@/lib/providers";
import {
  useProviderAudiences,
  useProviderConnections,
  useSyncAudiences,
  type ProviderAudienceRow,
} from "@/hooks/use-providers";
import {
  useCreateGenerationCampaign,
  useUpdateCampaign,
} from "@/hooks/use-campaign-generation-config";

export type DeliveryChannel = "email" | "whatsapp" | "sms";

export const DELIVERY_CHANNELS: {
  value: DeliveryChannel;
  label: string;
  description: string;
}[] = [
  { value: "email", label: "Email", description: "Entrega por correo electrónico (proveedor de email)." },
  { value: "whatsapp", label: "WhatsApp", description: "Entrega por WhatsApp vía Twilio (listas con teléfono)." },
  { value: "sms", label: "SMS", description: "Entrega por SMS vía Twilio (listas con teléfono)." },
];

export interface BuilderState {
  name: string;
  generationMode: GenerationMode | "";
  audienceId: string;
  deliveryChannel: DeliveryChannel;
  lyricsGoal: string;
  lyricsPrompt: string;
  musicStyle: string;
  voiceType: VoiceType | "";
  language: GenerationLanguage;
  mood: string;
  includeFirstName: boolean;
  emailSubject: string;
  emailBody: string;
}

export const EMPTY_BUILDER_STATE: BuilderState = {
  name: "",
  generationMode: "",
  audienceId: "",
  deliveryChannel: "email",
  lyricsGoal: "",
  lyricsPrompt: "",
  musicStyle: "",
  voiceType: "",
  language: "es",
  mood: "",
  includeFirstName: false,
  emailSubject: "",
  emailBody: "",
};

type StepKey =
  | "type"
  | "audience"
  | "lyrics"
  | "music"
  | "personalization"
  | "email"
  | "review";

export interface CampaignBuilderProps {
  mode: "create" | "edit";
  /** Required when mode === "edit". */
  campaignId?: string;
  initialState?: BuilderState;
  title: string;
  subtitle?: ReactNode;
  banner?: ReactNode;
}

export function CampaignBuilder({
  mode,
  campaignId,
  initialState,
  title,
  subtitle,
  banner,
}: CampaignBuilderProps) {
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
  const createCampaign = useCreateGenerationCampaign();
  const updateCampaign = useUpdateCampaign();
  const { data: audiences, isLoading: audiencesLoading } = useProviderAudiences(
    tenant?.id,
  );
  const { data: connections } = useProviderConnections(tenant?.id);
  const syncAudiences = useSyncAudiences(tenant?.id);

  const [step, setStep] = useState(0);
  const [state, setState] = useState<BuilderState>(
    initialState ?? EMPTY_BUILDER_STATE,
  );

  // On first load, sync provider audiences ONLY when none are cached yet, so
  // step 2 has groups to show. If audiences already exist we skip the network
  // sync (the user can refresh manually) — this avoids the spinner appearing
  // to spin every time the step is opened.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current) return;
    if (audiencesLoading) return; // wait for the cached audiences to load
    if ((audiences?.length ?? 0) > 0) {
      syncedRef.current = true; // already have groups — no auto-sync
      return;
    }
    const active = (connections ?? []).filter((c) => c.status === "connected");
    if (active.length === 0) return;
    syncedRef.current = true;
    active.forEach((c) => {
      syncAudiences.mutate(c.provider_type);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, audiences, audiencesLoading]);

  const isSaving = createCampaign.isPending || updateCampaign.isPending;

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

  // Delivery channel — Twilio (WhatsApp/SMS) is an additive provider whose
  // audiences are local contact lists synced into provider_audiences.
  const isPhoneChannel =
    state.deliveryChannel === "whatsapp" || state.deliveryChannel === "sms";

  const twilioConnection = useMemo(
    () =>
      (connections ?? []).find(
        (c) => c.provider_type === "twilio" && c.status === "connected",
      ) ?? null,
    [connections],
  );

  // Audiences shown depend on the channel: phone channels only list Twilio
  // audiences; email lists every NON-Twilio audience (current behaviour).
  const visibleAudiences = useMemo(() => {
    const all = audiences ?? [];
    const twilioConnIds = new Set(
      (connections ?? [])
        .filter((c) => c.provider_type === "twilio")
        .map((c) => c.id),
    );
    if (isPhoneChannel) {
      if (!twilioConnection) return [];
      return all.filter(
        (a) => a.provider_connection_id === twilioConnection.id,
      );
    }
    return all.filter((a) => !twilioConnIds.has(a.provider_connection_id));
  }, [audiences, connections, isPhoneChannel, twilioConnection]);

  // For Twilio audiences, contacts_count already reflects ACTIVE contacts with
  // a non-empty phone (the edge function computes it that way and only stores
  // lists with at least one). Require ≥1 for phone channels.
  const phoneAudienceValid =
    !isPhoneChannel ||
    (!!selectedAudience && (selectedAudience.contacts_count ?? 0) > 0);

  // When the channel changes, clear a selection that is no longer valid for the
  // new channel (e.g. switching email→WhatsApp drops the email audience).
  useEffect(() => {
    if (
      state.audienceId &&
      !visibleAudiences.some((a) => a.id === state.audienceId)
    ) {
      setState((prev) => ({ ...prev, audienceId: "" }));
    }
  }, [state.audienceId, visibleAudiences]);

  const estimatedCredits = useMemo(
    () =>
      calculateEstimatedCredits(
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
    base.push({ key: "email", title: "Email", icon: Mail });
    base.push({ key: "review", title: "Revisión", icon: Sparkles });
    return base;
  }, [state.generationMode]);

  const currentKey = steps[Math.min(step, steps.length - 1)]?.key ?? "type";

  const stepValid = useMemo(() => {
    switch (currentKey) {
      case "type":
        return state.name.trim().length > 0 && state.generationMode !== "";
      case "audience":
        return state.audienceId.length > 0 && phoneAudienceValid;
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
  }, [currentKey, state, phoneAudienceValid]);

  const isLastStep = step >= steps.length - 1;

  const handleSubmit = async () => {
    if (!tenant?.id || !selectedAudience || state.generationMode === "") {
      toast.error("Faltan datos para crear la campaña");
      return;
    }
    const payload = {
      tenantId: tenant.id,
      createdBy: user?.id ?? null,
      vertical: tenant.vertical ?? "music",
      name: state.name.trim(),
      generationMode: state.generationMode,
      deliveryChannel: state.deliveryChannel,
      providerConnectionId: selectedAudience.provider_connection_id,
      providerAudienceId: selectedAudience.id,
      audienceContacts: selectedAudience.contacts_count,
      lyricsGoal: state.lyricsGoal.trim() || null,
      lyricsPrompt: state.lyricsPrompt.trim() || null,
      musicStyle: state.musicStyle || null,
      voiceType: (state.voiceType === "" ? null : state.voiceType) as
        | VoiceType
        | null,
      language: state.language,
      mood: state.mood || null,
      includeFirstName:
        state.generationMode === "personalized_song"
          ? state.includeFirstName
          : false,
      emailSubject: state.emailSubject.trim() || null,
      emailBody: state.emailBody.trim() || null,
      estimatedCredits,
    };

    try {
      if (mode === "edit") {
        if (!campaignId) throw new Error("Campaña no encontrada");
        await updateCampaign.mutateAsync({ ...payload, campaignId });
        toast.success("Campaña actualizada correctamente");
        void navigate({ to: "/campaigns/$id", params: { id: campaignId } });
      } else {
        const id = await createCampaign.mutateAsync(payload);
        toast.success("Configuración de campaña guardada");
        void navigate({ to: "/campaigns/$id", params: { id } });
      }
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
          onClick={() =>
            void navigate(
              mode === "edit" && campaignId
                ? { to: "/campaigns/$id", params: { id: campaignId } }
                : { to: "/campaigns" },
            )
          }
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {mode === "edit" ? "Campaña" : "Campañas"}
        </Button>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      {banner}

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
              audiences={visibleAudiences}
              loading={audiencesLoading}
              syncing={syncAudiences.isPending}
              onRefresh={() => {
                (connections ?? [])
                  .filter((c) => c.status === "connected")
                  .forEach((c) => syncAudiences.mutate(c.provider_type));
              }}
              selectedId={state.audienceId}
              onSelect={(id) => update("audienceId", id)}
              providerLabelByConnection={providerLabelByConnection}
              generationMode={state.generationMode}
              estimatedCredits={estimatedCredits}
              deliveryChannel={state.deliveryChannel}
              onDeliveryChannelChange={(c) => update("deliveryChannel", c)}
              isPhoneChannel={isPhoneChannel}
              twilioConnected={!!twilioConnection}
              selectedAudience={selectedAudience}
              phoneAudienceValid={phoneAudienceValid}
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
          {currentKey === "email" && <StepEmail state={state} update={update} />}
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
          disabled={step === 0 || isSaving}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Atrás
        </Button>

        {isLastStep ? (
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1 h-4 w-4" />
            )}
            {mode === "edit" ? "Guardar cambios" : "Guardar configuración"}
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
const AUDIENCE_PAGE_SIZES = [25, 50, 100] as const;

function StepAudience({
  audiences,
  loading,
  syncing,
  onRefresh,
  selectedId,
  onSelect,
  providerLabelByConnection,
  generationMode,
  estimatedCredits,
  deliveryChannel,
  onDeliveryChannelChange,
  isPhoneChannel,
  twilioConnected,
  selectedAudience,
  phoneAudienceValid,
}: {
  audiences: ProviderAudienceRow[];
  loading: boolean;
  syncing: boolean;
  onRefresh: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
  providerLabelByConnection: Map<string, string>;
  generationMode: GenerationMode | "";
  estimatedCredits: number;
  deliveryChannel: DeliveryChannel;
  onDeliveryChannelChange: (channel: DeliveryChannel) => void;
  isPhoneChannel: boolean;
  twilioConnected: boolean;
  selectedAudience: ProviderAudienceRow | null;
  phoneAudienceValid: boolean;
}) {
  const [pageSize, setPageSize] = useState<number>(AUDIENCE_PAGE_SIZES[0]);
  const [page, setPage] = useState(0);

  const total = audiences.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const pageItems = audiences.slice(start, start + pageSize);

  // Reset to the first page when the size changes or the list shrinks.
  useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);

  const channelSelector = (
    <Field label="Canal de entrega" required>
      <Select
        value={deliveryChannel}
        onValueChange={(v) => onDeliveryChannelChange(v as DeliveryChannel)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DELIVERY_CHANNELS.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {DELIVERY_CHANNELS.find((c) => c.value === deliveryChannel)?.description}
      </p>
    </Field>
  );

  let body: ReactNode;

  if (isPhoneChannel && !twilioConnected) {
    body = (
      <EmptyState
        icon={MessageCircle}
        title="Sin proveedor de WhatsApp/SMS"
        description="Conecta un proveedor de WhatsApp/SMS en Configuración → Proveedores para usar este canal."
        action={
          <Button asChild>
            <Link to="/settings/providers">Ir a proveedores</Link>
          </Button>
        }
      />
    );
  } else if (loading) {
    body = (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando audiencias…
      </div>
    );
  } else if (audiences.length === 0) {
    body = (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={syncing}
          >
            <RefreshCw
              className={cn("mr-1.5 h-4 w-4", syncing && "animate-spin")}
            />
            Actualizar grupos
          </Button>
        </div>
        <EmptyState
          icon={Users}
          title={
            isPhoneChannel
              ? "No hay listas con teléfono sincronizadas"
              : "No hay audiencias sincronizadas"
          }
          description={
            isPhoneChannel
              ? "Sincroniza las audiencias de Twilio en Configuración → Proveedores. Solo aparecen listas con al menos un contacto con teléfono activo."
              : "Conecta un proveedor y sincroniza tus audiencias para seleccionarlas aquí."
          }
          action={
            <Button asChild>
              <Link to="/settings/providers">Ir a proveedores</Link>
            </Button>
          }
        />
      </div>
    );
  } else {
    body = (
      <>
        {/* Toolbar: counter + page size + refresh */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {total.toLocaleString("es-ES")}
            </span>{" "}
            {total === 1 ? "grupo" : "grupos"}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Por página</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-[72px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCE_PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={syncing}
            >
              <RefreshCw
                className={cn("mr-1.5 h-4 w-4", syncing && "animate-spin")}
              />
              {syncing ? "Actualizando…" : "Actualizar"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {pageItems.map((a) => {
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
                    {audienceTypeLabel(a.audience_type)} ·{" "}
                    {providerLabelByConnection.get(a.provider_connection_id) ??
                      "Proveedor"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">
                    {a.contacts_count.toLocaleString("es-ES")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPhoneChannel ? "con teléfono" : "contactos"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pagination controls */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {(start + 1).toLocaleString("es-ES")}–
              {Math.min(start + pageSize, total).toLocaleString("es-ES")} de{" "}
              {total.toLocaleString("es-ES")}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      {channelSelector}

      {body}

      {isPhoneChannel && selectedId && !phoneAudienceValid && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>
            La lista seleccionada no tiene contactos con teléfono activo. No
            podrás lanzar la campaña por{" "}
            {deliveryChannel === "sms" ? "SMS" : "WhatsApp"} hasta elegir una
            lista con al menos un contacto con teléfono.
          </span>
        </div>
      )}

      {selectedId && phoneAudienceValid && generationMode !== "" && (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Créditos estimados
            </span>
            <span className="font-display text-lg font-bold text-primary">
              {estimatedCredits.toLocaleString("es-ES")}
            </span>
          </div>
          {generationMode === "personalized_song" && (
            <p className="text-xs text-muted-foreground">
              Las campañas personalizadas consumen 1 crédito por destinatario,
              con un coste mínimo por campaña de 100 créditos.
            </p>
          )}
          {selectedAudience && isPhoneChannel && (
            <p className="text-xs text-muted-foreground">
              {selectedAudience.contacts_count.toLocaleString("es-ES")} contactos
              con teléfono activo en esta lista.
            </p>
          )}
        </div>
      )}
    </div>
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

// ── STEP · Email ─────────────────────────────────────────────────────────────
function StepEmail({ state, update }: StepProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm font-medium">Configura el email de la campaña</p>

      <Field label="Asunto del email" htmlFor="email-subject">
        <Input
          id="email-subject"
          value={state.emailSubject}
          onChange={(e) => update("emailSubject", e.target.value)}
          placeholder="Ej: Tu canción personalizada está lista 🎵"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Si lo dejas vacío se usará el título de la campaña.
        </p>
      </Field>

      <Field label="Texto del email" htmlFor="email-body">
        <Textarea
          id="email-body"
          value={state.emailBody}
          onChange={(e) => update("emailBody", e.target.value)}
          placeholder="Escribe aquí el mensaje principal del email que recibirán tus contactos. Será personalizado con el nombre del destinatario al abrirlo."
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground">
          El email incluye automáticamente el enlace a la Experiencia Musical.
        </p>
      </Field>
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
  // Single source of truth: same mapping used by Campaign Detail.
  const rows = [
    { label: "Campaña", value: state.name.trim() || "—" },
    ...buildCampaignConfigRows({
      generationMode: state.generationMode,
      audienceName: selectedAudience?.name ?? null,
      audienceSize: selectedAudience?.contacts_count ?? null,
      providerLabel: selectedAudience
        ? providerLabelByConnection.get(
            selectedAudience.provider_connection_id,
          ) ?? null
        : null,
      lyricsGoal: state.lyricsGoal.trim() || null,
      lyricsPrompt: state.lyricsPrompt.trim() || null,
      musicStyle: state.musicStyle || null,
      voiceType: state.voiceType || null,
      language: state.language,
      mood: state.mood || null,
      includeFirstName: state.includeFirstName,
      estimatedCredits,
    }),
  ];

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

      <dl className="divide-y divide-border rounded-xl border">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Asunto del email</dt>
          <dd
            className={cn(
              "text-right text-sm font-medium",
              !state.emailSubject.trim() && "text-muted-foreground italic",
            )}
          >
            {state.emailSubject.trim() || "Se usará el título de la campaña"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">Texto del email</dt>
          <dd
            className={cn(
              "max-w-[60%] text-right text-sm font-medium",
              !state.emailBody.trim() && "text-muted-foreground italic",
            )}
          >
            {state.emailBody.trim() || "Texto por defecto"}
          </dd>
        </div>
      </dl>

      {state.lyricsGoal.trim() && (
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Objetivo</p>
          <p className="mt-1 text-sm">{state.lyricsGoal}</p>
        </div>
      )}

      {state.lyricsPrompt.trim() && (
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Instrucciones para la letra
          </p>
          <p className="mt-1 text-sm">{state.lyricsPrompt}</p>
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
  children: ReactNode;
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
