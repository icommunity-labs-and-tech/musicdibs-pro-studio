import { createFileRoute } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/styleguide")({
  head: () => ({
    meta: [{ title: "Design System · MusicDibs Enterprise" }],
  }),
  component: StyleGuide,
});

const swatches = [
  { name: "Gold", varName: "Primary", className: "bg-gold text-night-900" },
  { name: "Gold dark", varName: "#8C5E0A", className: "bg-gold-dark text-white" },
  { name: "Gold light", varName: "#f3d98a", className: "bg-gold-light text-night-900" },
  { name: "Teal", varName: "Accent", className: "bg-teal text-night-900" },
  { name: "Teal dark", varName: "#0D7A64", className: "bg-teal-dark text-white" },
  { name: "Teal light", varName: "#5ee0cc", className: "bg-teal-light text-night-900" },
  { name: "Sand 50", varName: "#F5EFE6", className: "bg-sand text-night-900" },
  { name: "Sand 200", varName: "#EDE5D8", className: "bg-sand-200 text-night-900" },
  { name: "Sand 500", varName: "#9E8B72", className: "bg-sand-500 text-white" },
  { name: "Night 800", varName: "#1A1510", className: "bg-night-800 text-white" },
  { name: "Night 900", varName: "#0C0A08", className: "bg-night-900 text-white" },
];

function StyleGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-teal font-display text-lg font-bold text-night-900">
              M
            </div>
            <div>
              <p className="font-display text-base font-semibold leading-none">
                MusicDibs
              </p>
              <p className="text-xs text-muted-foreground">Design System</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
        <section className="space-y-3">
          <Badge className="bg-teal text-night-900 hover:bg-teal">Fase 0 · Validación</Badge>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            Sistema de diseño de marca
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Tokens de color, tipografías y componentes base tematizados con la
            identidad de MusicDibs. Usa el botón de arriba a la derecha para
            alternar entre <strong>modo claro</strong> y <strong>oscuro</strong>.
          </p>
        </section>

        {/* Tipografía */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Tipografía</h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fraunces · Display
                </p>
                <p className="font-display text-3xl font-semibold">
                  Campañas que suenan diferente
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Syne · Body
                </p>
                <p className="text-base">
                  El cuerpo de texto usa Syne para una lectura cercana y
                  profesional en toda la interfaz del producto.
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  JetBrains Mono · Code
                </p>
                <code className="rounded-md bg-muted px-2 py-1 text-sm">
                  supabase.functions.invoke("generate-campaign")
                </code>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Paleta */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Paleta</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {swatches.map((s) => (
              <div
                key={s.name}
                className={`flex h-24 flex-col justify-end rounded-xl border p-3 ${s.className}`}
              >
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="text-xs opacity-80">{s.varName}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Botones */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Botones</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button className="bg-teal text-night-900 hover:bg-teal-dark hover:text-white">
              Acento teal
            </Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Eliminar</Button>
          </div>
        </section>

        {/* Badges de estado */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Estados de campaña</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">draft</Badge>
            <Badge className="bg-gold-light text-night-900 hover:bg-gold-light">queued</Badge>
            <Badge className="bg-teal text-night-900 hover:bg-teal">generating</Badge>
            <Badge className="bg-success text-success-foreground hover:bg-success">ready</Badge>
            <Badge className="bg-gold text-night-900 hover:bg-gold">sent</Badge>
            <Badge variant="outline">archived</Badge>
          </div>
        </section>

        {/* Formulario + tarjeta */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Formularios y tarjetas</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Nueva campaña</CardTitle>
                <CardDescription>
                  Ejemplo de campos con la tipografía y tokens de marca.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la campaña</Label>
                  <Input id="name" placeholder="Lanzamiento primavera" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto del email</Label>
                  <Input id="subject" placeholder="Una canción para ti 🎵" />
                </div>
                <Button className="w-full">Continuar</Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gold/10 to-teal/10">
              <CardHeader>
                <CardTitle className="font-display">Tarjeta destacada</CardTitle>
                <CardDescription>
                  Superficies con degradado sutil de marca.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Coste estimado</p>
                <p className="font-display text-3xl font-bold text-gold-dark dark:text-gold">
                  $4,20
                </p>
                <p className="text-sm text-muted-foreground">Duración del clip: 30s</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="border-t pt-6 text-center text-sm text-muted-foreground">
          MusicDibs Enterprise · iCommunity Labs — checkpoint de design system
        </footer>
      </main>
    </div>
  );
}
