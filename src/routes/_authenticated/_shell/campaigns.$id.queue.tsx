import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useGenerationJobs,
  useGenerationJobsRealtime,
} from "@/hooks/use-campaign-detail";

export const Route = createFileRoute(
  "/_authenticated/_shell/campaigns/$id/queue",
)({
  head: () => ({ meta: [{ title: "Cola de generación · MusicDibs Enterprise" }] }),
  component: GenerationQueuePage,
});

const JOB_STATUS: Record<
  string,
  { label: string; pct: number; tone: string }
> = {
  queued: { label: "En cola", pct: 5, tone: "text-muted-foreground" },
  processing: { label: "Procesando", pct: 60, tone: "text-teal" },
  completed: { label: "Completada", pct: 100, tone: "text-success" },
  failed: { label: "Fallida", pct: 100, tone: "text-destructive" },
};

function GenerationQueuePage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, refetch } = useGenerationJobs(id);
  useGenerationJobsRealtime(id);

  const total = data?.length ?? 0;
  const done = data?.filter((j) => j.status === "completed").length ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        to="/campaigns/$id"
        params={{ id }}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Volver a la campaña
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Cola de generación
        </h1>
        {total > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {done.toLocaleString("es-ES")} de {total.toLocaleString("es-ES")}{" "}
            canciones completadas
          </p>
        ) : null}
      </div>

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No pudimos cargar la cola.
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={Clock}
          title="Sin trabajos de generación"
          description="Esta campaña todavía no tiene canciones en cola."
        />
      ) : (
        <ul className="space-y-3">
          {data!.map((job) => {
            const meta = JOB_STATUS[job.status] ?? {
              label: job.status,
              pct: 0,
              tone: "text-muted-foreground",
            };
            return (
              <li key={job.id}>
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <JobIcon status={job.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {job.contact_name || job.contact_email || "Contacto"}
                        </p>
                        {job.error_message ? (
                          <p className="truncate text-xs text-destructive">
                            {job.error_message}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {job.attempts > 0
                              ? `Intento ${job.attempts}`
                              : "En espera"}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn("text-xs font-medium", meta.tone)}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <Progress
                      value={meta.pct}
                      className={cn(
                        "mt-3",
                        job.status === "failed" && "[&>div]:bg-destructive",
                      )}
                    />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function JobIcon({ status }: { status: string }) {
  if (status === "completed")
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />;
  if (status === "failed")
    return <XCircle className="h-5 w-5 shrink-0 text-destructive" />;
  if (status === "processing")
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal" />;
  return <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />;
}
