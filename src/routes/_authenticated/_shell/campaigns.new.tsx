import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Music2,
  Rocket,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_TONES,
  CAMPAIGN_TYPES,
  CAMPAIGN_VERTICALS,
  DELIVERY_CHANNELS,
  DURATION_OPTIONS,
  MUSIC_STYLES,
  labelFor,
} from "@/lib/campaign-options";
import { useContactLists } from "@/hooks/use-contact-lists";
import { useCreateCampaign } from "@/hooks/use-create-campaign";

export const Route = createFileRoute("/_authenticated/_shell/campaigns/new")({
  head: () => ({ meta: [{ title: "Nueva campaña · MusicDibs Enterprise" }] }),
  component: CampaignBuilderPage,
});

const NO_LIST = "__none__";

interface BuilderState {
  name: string;
  type: string;
  vertical: string;
  goal: string;
  musicStyle: string;
  tone: string;
  aiPrompt: string;
  durationSeconds: number;
  deliveryChannel: string;
  subject: string;
  contactListId: string;
}

const STEPS = [
  { title: "Datos básicos", icon: Rocket },
  { title: "Música e IA", icon: Music2 },
  { title: "Entrega", icon: Send },
  { title: "Revisión", icon: Sparkles },
] as const;

function CampaignBuilderPage() {
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
  const createCampaign = useCreateCampaign();
  const { data: contactLists, isLoading: listsLoading } = useContactLists(
    tenant?.id,
  );

  const [step, setStep] = useState(0);
  const [state, setState] = useState<BuilderState>({
    name: "",
    type: "",
    vertical: tenant?.vertical ?? "",
    goal: "",
    musicStyle: "",
    tone: "",
    aiPrompt: "",
    durationSeconds: 30,
    deliveryChannel: "email",
    subject: "",
    contactListId: NO_LIST,
  });

  const update = <K extends keyof BuilderState>(
    key: K,
    value: BuilderState[K],
  ) => setState((prev) => ({ ...prev, [key]: value }));

  const stepValid = useMemo(() => {
    if (step === 0) {
      return (
        state.name.trim().length > 0 &&
        state.type.length > 0 &&
        state.vertical.length > 0
      );
    }
    if (step === 1) {
      return state.musicStyle.length > 0 && state.tone.length > 0;
    }
    if (step === 2) {
      return state.deliveryChannel.length > 0;
    }
    return true;
  }, [step, state]);

  const isLastStep = step === STEPS.length - 1;

  const handleSubmit = async () => {
    if (!tenant?.id) {
      toast.error("No se encontró tu espacio de trabajo");
      return;
    }
    try {
      const id = await createCampaign.mutateAsync({
        tenantId: tenant.id,
        createdBy: user?.id ?? null,
        name: state.name.trim(),
        type: state.type,
        vertical: state.vertical,
        goal: state.goal.trim() || null,
        musicStyle: state.musicStyle || null,
        tone: state.tone || null,
        aiPrompt: state.aiPrompt.trim() || null,
        durationSeconds: state.durationSeconds,
        language: "es",
        deliveryChannel: state.deliveryChannel,
        subject: state.subject.trim() || null,
        contactListId:
          state.contactListId === NO_LIST ? null : state.contactListId,
      });
      toast.success("Campaña creada como borrador");
      void navigate({ to: "/campaigns/$id", params: { id } });
    } catch (e) {
      toast.error("No pudimos crear la campaña", {
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
          Configura los detalles para generar canciones personalizadas.
        </p>
      </div>

      <Stepper step={step} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step].title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && <StepBasics state={state} update={update} />}
          {step === 1 && <StepMusic state={state} update={update} />}
          {step === 2 && (
            <StepDelivery
              state={state}
              update={update}
              contactLists={contactLists ?? []}
              listsLoading={listsLoading}
            />
          )}
          {step === 3 && (
            <StepReview state={state} contactLists={contactLists ?? []} />
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
            Crear borrador
          </Button>
        ) : (
          <Button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
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

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isDone = i < step;
        const isCurrent = i === step;
        return (
          <li key={s.title} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-colors",
                isCurrent && "border-primary bg-primary text-primary-foreground",
                isDone && "border-success bg-success text-success-foreground",
                !isCurrent &&
                  !isDone &&
                  "border-border text-muted-foreground",
              )}
            >
              {isDone ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>
            {i < STEPS.length - 1 && (
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

function StepBasics({ state, update }: StepProps) {
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
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo" required>
          <Select value={state.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vertical" required>
          <Select
            value={state.vertical}
            onValueChange={(v) => update("vertical", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un sector" />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_VERTICALS.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Objetivo (opcional)" htmlFor="goal">
        <Textarea
          id="goal"
          value={state.goal}
          onChange={(e) => update("goal", e.target.value)}
          placeholder="¿Qué quieres conseguir con esta campaña?"
          rows={3}
          maxLength={500}
        />
      </Field>
    </>
  );
}

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
              {MUSIC_STYLES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tono" required>
          <Select value={state.tone} onValueChange={(v) => update("tone", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un tono" />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Duración">
        <Select
          value={String(state.durationSeconds)}
          onValueChange={(v) => update("durationSeconds", Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={String(d.value)}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Instrucciones para la IA (opcional)" htmlFor="prompt">
        <Textarea
          id="prompt"
          value={state.aiPrompt}
          onChange={(e) => update("aiPrompt", e.target.value)}
          placeholder="Describe el mensaje, palabras clave o sensaciones que debe transmitir la canción."
          rows={4}
          maxLength={1000}
        />
      </Field>
    </>
  );
}

function StepDelivery({
  state,
  update,
  contactLists,
  listsLoading,
}: StepProps & {
  contactLists: { id: string; name: string; contact_count: number }[];
  listsLoading: boolean;
}) {
  return (
    <>
      <Field label="Canal de entrega" required>
        <Select
          value={state.deliveryChannel}
          onValueChange={(v) => update("deliveryChannel", v)}
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
      </Field>
      {state.deliveryChannel === "email" && (
        <Field label="Asunto del email (opcional)" htmlFor="subject">
          <Input
            id="subject"
            value={state.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="Una sorpresa musical para ti 🎵"
            maxLength={150}
          />
        </Field>
      )}
      <Field label="Lista de contactos (opcional)">
        <Select
          value={state.contactListId}
          onValueChange={(v) => update("contactListId", v)}
          disabled={listsLoading}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={listsLoading ? "Cargando…" : "Sin lista"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LIST}>Sin lista</SelectItem>
            {contactLists.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} ({l.contact_count.toLocaleString("es-ES")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

function StepReview({
  state,
  contactLists,
}: {
  state: BuilderState;
  contactLists: { id: string; name: string }[];
}) {
  const listName =
    state.contactListId === NO_LIST
      ? "Sin lista"
      : contactLists.find((l) => l.id === state.contactListId)?.name ?? "—";

  const rows: { label: string; value: string }[] = [
    { label: "Nombre", value: state.name || "—" },
    { label: "Tipo", value: labelFor(CAMPAIGN_TYPES, state.type) },
    { label: "Vertical", value: labelFor(CAMPAIGN_VERTICALS, state.vertical) },
    { label: "Estilo musical", value: labelFor(MUSIC_STYLES, state.musicStyle) },
    { label: "Tono", value: labelFor(CAMPAIGN_TONES, state.tone) },
    { label: "Duración", value: `${state.durationSeconds} segundos` },
    {
      label: "Canal",
      value: labelFor(DELIVERY_CHANNELS, state.deliveryChannel),
    },
    { label: "Lista de contactos", value: listName },
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
      {state.goal && (
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Objetivo</p>
          <p className="mt-1 text-sm">{state.goal}</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        La campaña se guardará como <strong>borrador</strong>. Podrás revisarla y
        lanzar la generación desde su detalle.
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
