import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AUDIO_DEMOS } from "@/lib/landing-content";

export function AudioDemoModal({
  open,
  onOpenChange,
  onRequestDemo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestDemo: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border p-6 text-left">
          <DialogTitle className="font-display text-2xl">
            Escucha lo que tus clientes van a sentir
          </DialogTitle>
          <DialogDescription>
            Una pieza por industria, generada para un objetivo de campaña real.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-6">
          {AUDIO_DEMOS.map((demo) => (
            <article
              key={demo.key}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {demo.icon}
                  </span>
                  <div>
                    <h3 className="font-display text-base font-semibold">
                      {demo.sector}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {demo.objective}
                    </p>
                  </div>
                </div>
                <Badge className="shrink-0 bg-teal text-night-900">{demo.badge}</Badge>
              </div>
              
            </article>
          ))}
        </div>

        <div className="border-t border-border p-6">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              onOpenChange(false);
              onRequestDemo();
            }}
          >
            Generar un audio para mi sector → Solicitar demo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
