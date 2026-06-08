import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GenerationBatchRow } from "@/hooks/use-generation";

interface Props {
  batch: GenerationBatchRow | null;
  status: string; // campaign status
}

export function PersonalizedProgressPanel({ batch, status }: Props) {
  if (!batch && status !== "generating" && status !== "ready_to_send") return null;

  const total = batch?.total_jobs ?? 0;
  const completed = batch?.completed_jobs ?? 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = status === "ready_to_send" || batch?.status === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {isComplete
            ? "Canciones generadas"
            : "Generando canciones personalizadas…"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">
              {completed.toLocaleString("es-ES")} / {total.toLocaleString("es-ES")}
            </span>
          </div>
          <Progress value={percent} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Listas
            </div>
            <p className="mt-1 text-2xl font-bold">{completed}</p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Pendientes
            </div>
            <p className="mt-1 text-2xl font-bold">
              {Math.max(0, total - completed)}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              Fallidas
            </div>
            <p className="mt-1 text-2xl font-bold">0</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
