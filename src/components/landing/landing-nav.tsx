import { useEffect, useState } from "react";
import { Menu, Play, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/landing-content";
import { cn } from "@/lib/utils";

function LandingLogo() {
  return (
    <a href="#top" className="inline-flex items-center gap-3" aria-label="MusicDibs Enterprise — inicio">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-teal font-display text-lg font-bold text-night-900">
        M
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-base font-semibold">MusicDibs</span>
        <span className="text-xs text-muted-foreground">Enterprise</span>
      </span>
    </a>
  );
}

export function LandingNav({
  onListen,
  onRequestDemo,
}: {
  onListen: () => void;
  onRequestDemo: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <LandingLogo />

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button variant="ghost" onClick={onRequestDemo}>
            Solicitar demo
          </Button>
          <Button onClick={onListen}>
            <Play className="size-4" />
            Escuchar ejemplos
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button
                onClick={() => {
                  setOpen(false);
                  onListen();
                }}
              >
                <Play className="size-4" />
                Escuchar ejemplos
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  onRequestDemo();
                }}
              >
                Solicitar demo
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
