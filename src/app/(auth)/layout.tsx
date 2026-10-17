import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Centered shell for every auth screen (login, signup, recovery, banned).
 * One soft purple glow at the top — the only decorative gradient in the app.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(70%_100%_at_50%_0%,oklch(0.92_0.05_292/0.55),transparent)] dark:bg-[radial-gradient(70%_100%_at_50%_0%,oklch(0.32_0.07_292/0.35),transparent)]"
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Brand className="mb-8" />

      <main className="w-full max-w-md">{children}</main>

      <p className="mt-8 text-xs text-muted-foreground">
        Open to East Delta University students
      </p>
    </div>
  );
}
