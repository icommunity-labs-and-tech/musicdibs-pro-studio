import { useEffect, useState } from "react";
import { Menu, Play, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import logoWhite from "@/assets/logo-musicdibs-white.jpg";
import logoDark from "@/assets/logo-musicdibs-dark.jpg";
import { NAV_LINKS } from "@/lib/landing-content";
import { cn } from "@/lib/utils";

function LandingLogo({ scrolled }: { scrolled: boolean }) {
  const { theme } = useTheme();
  // Dark background → white logo; light background → dark logo.
  // When not scrolled the header sits over the dark hero (dark bg).
  // When scrolled the header uses bg-background, which is dark in dark mode.
  const darkBackground = !scrolled || theme === "dark";

  return (
    <a href="#top" className="inline-flex items-center gap-3" aria-label="Musicdibs Enterprise — inicio">
      <img
        src={darkBackground ? logoWhite : logoDark}
        alt="Musicdibs"
        className="h-9 w-auto shrink-0 object-contain"
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-base font-semibold",
            darkBackground && !scrolled && "text-sand",
          )}
        >
          Musicdibs
        </span>
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
        <LandingLogo scrolled={scrolled} />

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-sand-200 hover:text-sand",
              )}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={onRequestDemo}
            className={cn(!scrolled && "text-sand-200 hover:bg-sand/10 hover:text-sand")}
          >
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
