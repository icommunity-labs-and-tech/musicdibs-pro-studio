import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, MessageSquare, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LandingFooter } from "@/components/landing/landing-footer";

export const Route = createFileRoute("/connect")({
  component: ConnectPage,
  head: () => ({
    meta: [
      { title: "Conecta tu asistente de IA · MusicDibs" },
      {
        name: "description",
        content:
          "Conecta ChatGPT o Claude a MusicDibs en unos pocos pasos para consultar tus experiencias musicales desde tu asistente de IA.",
      },
      { property: "og:title", content: "Conecta tu asistente de IA a MusicDibs" },
      {
        property: "og:description",
        content:
          "Copia la URL del servidor y sigue los pasos para conectar ChatGPT o Claude a MusicDibs.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

// The MCP server runs on the Lovable-published Worker, NOT on the Vercel static
// SPA (enterprise.musicdibs.com), where /mcp returns index.html and any MCP
// client fails. Always advertise the Worker URL so ChatGPT/Claude connect to a
// host that actually serves the /mcp endpoint.
const MCP_URL = "https://musicdibs-enterprise.lovable.app/mcp";

function ConnectPage() {
  const [mcpUrl] = useState(MCP_URL);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!mcpUrl) return;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-medium text-teal">
          <Sparkles className="h-4 w-4" />
          Integraciones con agentes de IA
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Conecta tu asistente de IA a MusicDibs
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Conecta ChatGPT o Claude a MusicDibs para que tu asistente pueda
          consultar tus experiencias musicales publicadas directamente desde el
          chat.
        </p>

        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="text-lg">URL del servidor</CardTitle>
            <CardDescription>
              Copia esta dirección: la necesitarás para conectar tu asistente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm">
                {mcpUrl || "Cargando…"}
              </code>
              <Button
                onClick={handleCopy}
                disabled={!mcpUrl}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copiar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-teal" />
                Conectar con ChatGPT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground marker:font-semibold marker:text-foreground">
                <li>
                  Abre{" "}
                  <a
                    href="https://chatgpt.com/#settings/Connectors/Advanced"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-teal underline-offset-4 hover:underline"
                  >
                    los ajustes de conectores de ChatGPT
                  </a>{" "}
                  y activa el modo desarrollador (ten en cuenta el aviso de
                  riesgo que aparece).
                </li>
                <li>
                  En el menú «+» del cuadro de mensaje, activa el modo
                  desarrollador.
                </li>
                <li>
                  Pulsa «Add sources» y luego «Connect more».
                </li>
                <li>
                  Ponle un nombre al conector y pega la URL del servidor de
                  arriba.
                </li>
                <li>Pídele a ChatGPT que use MusicDibs.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-teal" />
                Conectar con Claude
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground marker:font-semibold marker:text-foreground">
                <li>
                  Abre{" "}
                  <a
                    href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-teal underline-offset-4 hover:underline"
                  >
                    la pantalla para añadir un conector personalizado en Claude
                  </a>
                  .
                </li>
                <li>
                  Ponle un nombre al conector y pega la URL del servidor de
                  arriba.
                </li>
                <li>
                  Activa el conector desde el cuadro de mensaje y pídele a Claude
                  que use MusicDibs.
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
