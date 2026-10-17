import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, profile } = await getAuthContext();
  if (!user) {
    redirect("/login?next=/change-password");
  }

  const params = await searchParams;
  const forced = params.forced === "1" || Boolean(profile?.must_change_password);

  return <ChangePasswordForm forced={forced} />;
}
