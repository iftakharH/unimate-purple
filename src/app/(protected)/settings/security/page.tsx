import type { Metadata } from "next";

import { SettingsTabs } from "@/components/settings-tabs";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/app/(auth)/change-password/change-password-form";
import { DangerZone } from "./danger-zone";
import { EmailForm } from "./email-form";
import { MfaCard } from "./mfa-card";

export const metadata: Metadata = { title: "Security" };

export default async function SecuritySettingsPage() {
  const { supabase, user } = await requireUser();

  // Server-side (single source of truth): current MFA factor state.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const enabledFactorId =
    factors?.totp.find((f) => f.status === "verified")?.id ?? null;
  const unverifiedFactorIds =
    factors?.totp.filter((f) => f.status !== "verified").map((f) => f.id) ?? [];

  return (
    <div className="space-y-6">
      <SettingsTabs />

      <section aria-labelledby="password-heading" className="space-y-3">
        <h2 id="password-heading" className="text-sm font-medium text-muted-foreground">
          Password
        </h2>
        <ChangePasswordForm forced={false} />
      </section>

      <section aria-labelledby="email-heading" className="space-y-3">
        <h2 id="email-heading" className="text-sm font-medium text-muted-foreground">
          Email address
        </h2>
        <EmailForm currentEmail={user.email ?? ""} />
      </section>

      <section aria-labelledby="mfa-heading" className="space-y-3">
        <h2 id="mfa-heading" className="text-sm font-medium text-muted-foreground">
          Two-factor authentication
        </h2>
        <MfaCard
          initialEnabledFactorId={enabledFactorId}
          unverifiedFactorIds={unverifiedFactorIds}
        />
      </section>

      <section aria-labelledby="danger-heading" className="space-y-3">
        <h2 id="danger-heading" className="text-sm font-medium text-muted-foreground">
          Danger zone
        </h2>
        <DangerZone email={user.email ?? ""} />
      </section>
    </div>
  );
}
