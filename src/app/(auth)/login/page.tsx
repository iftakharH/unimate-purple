import type { Metadata } from "next";

import { Alert } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const linkError = params.error === "link";
  const deleted = params.deleted === "1";

  return (
    <div className="space-y-4">
      {deleted && (
        <Alert>Your account has been deleted. Sorry to see you go.</Alert>
      )}
      {linkError && (
        <Alert variant="destructive">
          That link is invalid or has expired. Sign in, or request a new link.
        </Alert>
      )}
      <LoginForm next={next} />
    </div>
  );
}
