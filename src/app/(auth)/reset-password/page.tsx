import type { Metadata } from "next";
import Link from "next/link";

import { getAuthContext } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "New password" };

export default async function ResetPasswordPage() {
  const { user } = await getAuthContext();

  if (!user) {
    return (
      <Card className="elev-2">
        <CardHeader>
          <CardTitle className="text-xl">Link expired</CardTitle>
          <CardDescription>
            This password-reset link is invalid or has already been used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            Request a fresh link and try again — they expire quickly for security.
          </Alert>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Request a new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm />;
}
