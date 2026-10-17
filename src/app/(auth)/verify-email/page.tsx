import type { Metadata } from "next";
import { MailCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResendForm } from "./resend-form";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <Card className="elev-2">
      <CardHeader className="items-center text-center">
        <MailCheck className="size-10 text-primary" aria-hidden />
        <CardTitle className="text-xl">Check your inbox</CardTitle>
        <CardDescription className="text-balance">
          {email
            ? `We sent a confirmation link to ${email}.`
            : "We sent you a confirmation link."}{" "}
          Click it to activate your account, then sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResendForm defaultEmail={email} />
      </CardContent>
    </Card>
  );
}
