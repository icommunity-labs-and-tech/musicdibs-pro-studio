import { BrandMark } from "@/components/app/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthCardLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-sand/40 dark:to-night-800/60">
      <header className="flex items-center justify-between px-4 py-5 sm:px-8">
        <BrandMark asLink={false} />
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
          {footer ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
