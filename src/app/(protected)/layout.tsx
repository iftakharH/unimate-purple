import { redirect } from "next/navigation";

import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { SiteNav } from "@/components/site-nav";
import { requireUser } from "@/lib/auth";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";

/**
 * Shell for every signed-in screen. Guards run here (the real authorization
 * checks) — the proxy only refreshes the session. The floating glass nav and
 * the ambient veil carry across every page in this area.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  if (profile?.is_banned) {
    redirect("/banned");
  }
  if (profile?.must_change_password) {
    redirect("/change-password?forced=1");
  }

  return (
    <div className="relative flex min-h-svh flex-col">
      <AmbientBackdrop
        hueA={BRAND_HUE}
        hueB={PARTNER_HUES[1]}
        height="380px"
        className="opacity-70"
      />
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-24 sm:pt-28">
        {children}
      </main>
    </div>
  );
}
