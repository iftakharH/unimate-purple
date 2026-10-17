"use client";

import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type EnrollState = { factorId: string; qrCode: string; secret: string } | null;

/**
 * Optional TOTP two-factor authentication (any authenticator app).
 *
 * Initial factor state is provided by the server page (single source of
 * truth); this component only mutates it through the browser client's MFA
 * APIs, which operate on the current session.
 */
export function MfaCard({
  initialEnabledFactorId,
  unverifiedFactorIds,
}: {
  initialEnabledFactorId: string | null;
  unverifiedFactorIds: string[];
}) {
  const router = useRouter();
  const [enabledFactorId, setEnabledFactorId] = useState(initialEnabledFactorId);
  const [enroll, setEnroll] = useState<EnrollState>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    setBusy(true);
    try {
      const supabase = createClient();

      // Clean up any abandoned enrollment attempt first.
      for (const factorId of unverifiedFactorIds) {
        await supabase.auth.mfa.unenroll({ factorId });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${Date.now()}`,
      });
      if (error) {
        toast.error("Could not start 2FA setup — try again.");
        return;
      }
      setEnroll({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!enroll) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const challenge = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (challenge.error) {
        toast.error("Could not verify the code — try again.");
        return;
      }
      const verify = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) {
        toast.error("That code didn't match — check your app and try again.");
        return;
      }
      toast.success("Two-factor authentication is on.");
      setEnabledFactorId(enroll.factorId);
      setEnroll(null);
      setCode("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll() {
    if (!enroll) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
      setEnroll(null);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!enabledFactorId) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId: enabledFactorId });
      if (error) {
        toast.error("Could not turn off 2FA — try again.");
        return;
      }
      toast.success("Two-factor authentication is off.");
      setEnabledFactorId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="elev-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="size-4" aria-hidden />
          Authenticator app
        </CardTitle>
        <CardDescription>
          {enabledFactorId
            ? "Two-factor authentication is ON for this account."
            : "Add a one-time code from any authenticator app when you sign in."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabledFactorId ? (
          <Button variant="outline" onClick={disable} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Turn off 2FA
          </Button>
        ) : enroll ? (
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Open your authenticator app and scan this code.</li>
              <li>Enter the 6-digit code it shows to confirm.</li>
            </ol>
            {/* Supabase returns the QR as an inline SVG data URI */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enroll.qrCode}
              alt="QR code for two-factor setup"
              className="elev-1 size-44 rounded-xl border bg-white p-2"
            />
            <p className="break-all text-xs text-muted-foreground">
              Can&apos;t scan? Enter this key manually:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">{enroll.secret}</code>
            </p>
            <div className="space-y-2">
              <Label htmlFor="totp-code">6-digit code</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="max-w-40 text-center font-mono text-lg tracking-[0.3em]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmEnroll} disabled={busy || code.length !== 6}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Verify and turn on
              </Button>
              <Button variant="ghost" onClick={cancelEnroll} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={startEnroll} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            <ShieldCheck aria-hidden /> Set up 2FA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
