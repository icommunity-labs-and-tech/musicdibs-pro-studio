import { useTheme } from "@/components/theme-provider";
import logoWhite from "@/assets/logo-musicdibs-white.jpg";
import logoDark from "@/assets/logo-musicdibs-dark.jpg";
import { NAV_LINKS } from "@/lib/landing-content";

export function LandingFooter() {
  const { theme } = useTheme();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          <div className="max-w-xs">
            <div className="flex items-center gap-3">
              <img
                src={theme === "dark" ? logoWhite : logoDark}
                alt="Logotipo de Musicdibs Enterprise"
                className="h-9 w-auto shrink-0 object-contain"
              />
              <span className="flex flex-col leading-tight">
                <span className="font-display text-base font-semibold">
                  Musicdibs Enterprise
                </span>
                <span className="text-xs font-medium text-teal">powered by iCommunity</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Convierte cada comunicación digital en una experiencia sonora memorable.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Acceder
            </a>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} iCommunity Labs. Todos los derechos reservados.</p>
          <p>Usamos cookies esenciales para el funcionamiento del sitio.</p>
        </div>
      </div>
    </footer>
  );
}
