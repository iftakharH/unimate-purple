import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";

/**
 * Centered shell for every auth screen (login, signup, recovery, banned).
 * Carries the same ambient veil as the rest of the product (Phase 5).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <AmbientBackdrop hueA={BRAND_HUE} hueB={PARTNER_HUES[0]} height="560px" />

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
